import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { MarginCalculator } from './margin-calculator';
import { FeeCalculator } from './fee-calculator';
import { MarketDataService } from '../market-data/market-data.service';

@Injectable()
export class AccountLifecycle {
  private readonly logger = new Logger(AccountLifecycle.name);
  private supabase: SupabaseClient;

  constructor(
    private config: ConfigService,
    private marginCalc: MarginCalculator,
    private feeCalc: FeeCalculator,
    private marketData: MarketDataService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  /**
   * Run terminal checks on an account after a fill or mark-to-market.
   * If terminal, close all majors positions and flip state.
   */
  async checkAndTransition(accountId: string): Promise<{
    transitioned: boolean;
    newState?: 'ZEROED' | 'LIQUIDATED';
  }> {
    // Fetch account
    const { data: account } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account || account.status !== 'ACTIVE') {
      return { transitioned: false };
    }

    // Fetch open positions
    const { data: positions } = await this.supabase
      .from('positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_open', true);

    const openPositions = (positions ?? []).map((p) => ({
      symbol: p.symbol,
      quantity: Number(p.quantity),
      avgEntryPrice: Number(p.avg_entry_price),
      currentPrice: Number(p.current_price ?? p.avg_entry_price),
      side: p.side as 'LONG' | 'SHORT',
    }));

    // Recompute equity and margin
    const equity = this.marginCalc.computeEquity(
      Number(account.cash),
      openPositions,
    );

    const marginUsed = this.marginCalc.computeMarginUsed(openPositions);

    // Update equity on account
    await this.supabase
      .from('accounts')
      .update({ equity, margin_used: marginUsed })
      .eq('id', accountId);

    // Check terminal
    const { isTerminal, reason } = this.marginCalc.checkTerminal(
      equity,
      marginUsed,
    );

    if (!isTerminal) {
      return { transitioned: false };
    }

    this.logger.warn(
      `Account ${accountId} transitioning to ${reason}: equity=${equity.toFixed(2)} marginUsed=${marginUsed.toFixed(2)}`,
    );

    // Close all open positions at mark
    for (const pos of openPositions) {
      const quote = await this.marketData.getQuote(pos.symbol);
      const markPrice = quote?.price ?? pos.currentPrice;

      const { fillPrice, feeAmount } = this.feeCalc.calculate(
        markPrice,
        pos.quantity,
        pos.symbol,
        pos.side === 'LONG' ? 'SELL' : 'BUY',
        quote?.liquidityUsd,
      );

      const priceDiff = fillPrice - pos.avgEntryPrice;
      const realizedPnl =
        pos.side === 'LONG'
          ? priceDiff * pos.quantity
          : -priceDiff * pos.quantity;

      // Close position
      const posRow = (positions ?? []).find(
        (p) => p.symbol === pos.symbol && p.is_open,
      );

      if (posRow) {
        await this.supabase
          .from('positions')
          .update({
            is_open: false,
            closed_at: new Date().toISOString(),
            current_price: fillPrice,
            realized_pnl: Number(posRow.realized_pnl) + realizedPnl - feeAmount,
            unrealized_pnl: 0,
          })
          .eq('id', posRow.id);
      }
    }

    // Flip account state
    const now = new Date().toISOString();
    const deathFields =
      reason === 'ZEROED'
        ? { status: 'ZEROED', death_reason: 'EQUITY_DEPLETED', death_ts: now, death_equity: equity }
        : { status: 'LIQUIDATED', death_reason: 'MAINTENANCE_MARGIN_BREACH', death_ts: now, death_equity: equity };

    await this.supabase
      .from('accounts')
      .update(deathFields)
      .eq('id', accountId);

    // Log event
    await this.supabase.from('account_events').insert({
      account_id: accountId,
      event_type: reason!,
      payload: {
        equity,
        marginUsed,
        positionsClosed: openPositions.length,
        timestamp: now,
      },
    });

    return { transitioned: true, newState: reason };
  }
}
