import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrderValidator } from './order-validator';
import { FeeCalculator } from './fee-calculator';
import { MarginCalculator } from './margin-calculator';
import { PositionManager } from './position-manager';
import { AccountLifecycle } from './account-lifecycle';
import { MarketDataService } from '../market-data/market-data.service';

export interface PlaceOrderParams {
  accountId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  leverage?: number;
  cycleId?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  tradeId?: string;
  fillPrice?: number;
  fee?: number;
  rejectReason?: string;
  accountTerminated?: boolean;
  terminalState?: 'ZEROED' | 'LIQUIDATED';
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  private supabase: SupabaseClient;

  constructor(
    private config: ConfigService,
    private orderValidator: OrderValidator,
    private feeCalculator: FeeCalculator,
    private marginCalculator: MarginCalculator,
    private positionManager: PositionManager,
    private accountLifecycle: AccountLifecycle,
    private marketData: MarketDataService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  /**
   * Execute an order through the full validation → fill → settle pipeline.
   * This is the authoritative path — all rules are enforced here.
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    const { accountId, symbol, side, quantity, leverage = 1, cycleId } = params;

    // 1. Load account
    const { data: account } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account) {
      return { success: false, rejectReason: 'ACCOUNT_NOT_FOUND' };
    }

    // 2. Load open positions
    const { data: positions } = await this.supabase
      .from('positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_open', true);

    // 3. Get quote
    const quote = await this.marketData.getQuote(symbol);

    // 4. Get tradable universe
    const universe = await this.marketData.getUniverse();
    const tradableSymbols = universe.map((t) => t.symbol);

    // 5. Validate
    const validation = this.orderValidator.validate({
      symbol,
      side,
      quantity,
      leverage,
      account: {
        status: account.status,
        equity: Number(account.equity),
        cash: Number(account.cash),
        marginUsed: Number(account.margin_used),
      },
      positions: (positions ?? []).map((p) => ({
        symbol: p.symbol,
        quantity: Number(p.quantity),
        side: p.side as 'LONG' | 'SHORT',
        isOpen: p.is_open,
      })),
      quote,
      tradableSymbols,
    });

    if (!validation.valid) {
      // Create rejected order record
      const { data: rejectedOrder } = await this.supabase
        .from('orders')
        .insert({
          account_id: accountId,
          symbol,
          side,
          quantity,
          leverage,
          status: 'REJECTED',
          reject_reason: validation.reason,
          cycle_id: cycleId ?? null,
        })
        .select('id')
        .single();

      await this.logEvent(accountId, 'ORDER_REJECTED', {
        orderId: rejectedOrder?.id,
        symbol,
        side,
        quantity,
        reason: validation.reason,
      });

      return {
        success: false,
        orderId: rejectedOrder?.id,
        rejectReason: validation.reason,
      };
    }

    // 6. Compute fees + slippage
    const markPrice = quote!.price;
    const { fillPrice, feeAmount, slippageBps } = this.feeCalculator.calculate(
      markPrice,
      quantity,
      symbol,
      side,
      quote!.liquidityUsd,
    );

    // 7. Check margin for new position
    const notional = quantity * fillPrice;
    const marginCheck = this.marginCalculator.checkMargin(
      Number(account.equity),
      Number(account.margin_used),
      notional,
      leverage,
      symbol,
    );

    if (!marginCheck.canOpenPosition) {
      const { data: rejectedOrder } = await this.supabase
        .from('orders')
        .insert({
          account_id: accountId,
          symbol,
          side,
          quantity,
          leverage,
          status: 'REJECTED',
          reject_reason: marginCheck.reason,
          cycle_id: cycleId ?? null,
          requested_price: markPrice,
        })
        .select('id')
        .single();

      return {
        success: false,
        orderId: rejectedOrder?.id,
        rejectReason: marginCheck.reason,
      };
    }

    // 8. Create filled order
    const { data: order } = await this.supabase
      .from('orders')
      .insert({
        account_id: accountId,
        symbol,
        side,
        quantity,
        leverage,
        status: 'FILLED',
        requested_price: markPrice,
        filled_price: fillPrice,
        fee: feeAmount,
        slippage_bps: slippageBps,
        cycle_id: cycleId ?? null,
      })
      .select('id')
      .single();

    if (!order) {
      return { success: false, rejectReason: 'ORDER_INSERT_FAILED' };
    }

    // 9. Compute position update
    const existingPosition = (positions ?? []).find(
      (p) => p.symbol === symbol && p.is_open,
    );

    const posUpdate = this.positionManager.computePositionUpdate({
      symbol,
      orderSide: side,
      fillQuantity: quantity,
      fillPrice,
      existingPosition,
    });

    // 10. Apply position changes
    if (posUpdate.shouldClose && posUpdate.positionId) {
      await this.supabase
        .from('positions')
        .update({
          is_open: false,
          closed_at: new Date().toISOString(),
          current_price: fillPrice,
          realized_pnl: Number(existingPosition?.realized_pnl ?? 0) + posUpdate.realizedPnl,
          unrealized_pnl: 0,
          quantity: 0,
        })
        .eq('id', posUpdate.positionId);
    }

    if (posUpdate.type === 'OPEN' || posUpdate.type === 'FLIP') {
      const positionSide: 'LONG' | 'SHORT' = side === 'BUY' ? 'LONG' : 'SHORT';
      await this.supabase.from('positions').insert({
        account_id: accountId,
        symbol,
        side: positionSide,
        quantity: posUpdate.newQuantity,
        avg_entry_price: posUpdate.newAvgEntryPrice,
        current_price: fillPrice,
        unrealized_pnl: 0,
        realized_pnl: 0,
        is_open: true,
      });
    } else if (
      (posUpdate.type === 'INCREASE' || posUpdate.type === 'REDUCE') &&
      posUpdate.positionId
    ) {
      await this.supabase
        .from('positions')
        .update({
          quantity: posUpdate.newQuantity,
          avg_entry_price: posUpdate.newAvgEntryPrice,
          current_price: fillPrice,
          realized_pnl: Number(existingPosition?.realized_pnl ?? 0) + posUpdate.realizedPnl,
        })
        .eq('id', posUpdate.positionId);
    }

    // 11. Create trade record
    const { data: trade } = await this.supabase
      .from('trades')
      .insert({
        order_id: order.id,
        account_id: accountId,
        symbol,
        side,
        quantity,
        price: fillPrice,
        fee: feeAmount,
        realized_pnl: posUpdate.realizedPnl,
      })
      .select('id')
      .single();

    // 12. Update account cash
    const cashDelta =
      side === 'BUY'
        ? -(quantity * fillPrice + feeAmount)
        : quantity * fillPrice - feeAmount;

    const newCash = Number(account.cash) + cashDelta + posUpdate.realizedPnl;

    await this.supabase
      .from('accounts')
      .update({ cash: newCash })
      .eq('id', accountId);

    // 13. Log event
    await this.logEvent(accountId, 'ORDER_FILLED', {
      orderId: order.id,
      tradeId: trade?.id,
      symbol,
      side,
      quantity,
      fillPrice,
      fee: feeAmount,
      realizedPnl: posUpdate.realizedPnl,
    });

    // 14. Terminal checks
    const { transitioned, newState } =
      await this.accountLifecycle.checkAndTransition(accountId);

    return {
      success: true,
      orderId: order.id,
      tradeId: trade?.id,
      fillPrice,
      fee: feeAmount,
      accountTerminated: transitioned,
      terminalState: newState,
    };
  }

  private async logEvent(
    accountId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.supabase.from('account_events').insert({
      account_id: accountId,
      event_type: eventType,
      payload,
    });
  }
}
