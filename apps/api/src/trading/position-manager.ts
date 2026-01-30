import { Injectable, Logger } from '@nestjs/common';
import { MAJORS_ALLOWLIST } from '@claude-trade/shared';

interface PositionRow {
  id: string;
  account_id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  avg_entry_price: number;
  current_price: number | null;
  unrealized_pnl: number;
  realized_pnl: number;
  is_open: boolean;
}

export interface PositionUpdate {
  type: 'OPEN' | 'INCREASE' | 'REDUCE' | 'CLOSE' | 'FLIP';
  positionId?: string;
  newQuantity: number;
  newAvgEntryPrice: number;
  realizedPnl: number;
  shouldClose: boolean;
}

@Injectable()
export class PositionManager {
  private readonly logger = new Logger(PositionManager.name);

  /**
   * Determine position changes from a fill.
   */
  computePositionUpdate(params: {
    symbol: string;
    orderSide: 'BUY' | 'SELL';
    fillQuantity: number;
    fillPrice: number;
    existingPosition?: PositionRow;
  }): PositionUpdate {
    const { symbol, orderSide, fillQuantity, fillPrice, existingPosition } = params;
    const isMajor = (MAJORS_ALLOWLIST as readonly string[]).includes(symbol);

    // Determine the effective position side from the order
    const fillSide: 'LONG' | 'SHORT' = orderSide === 'BUY' ? 'LONG' : 'SHORT';

    // No existing open position — open new
    if (!existingPosition || !existingPosition.is_open) {
      return {
        type: 'OPEN',
        newQuantity: fillQuantity,
        newAvgEntryPrice: fillPrice,
        realizedPnl: 0,
        shouldClose: false,
      };
    }

    const pos = existingPosition;

    // Same direction — increase position
    if (pos.side === fillSide) {
      const totalQty = pos.quantity + fillQuantity;
      const newAvg =
        (pos.avg_entry_price * pos.quantity + fillPrice * fillQuantity) / totalQty;

      return {
        type: 'INCREASE',
        positionId: pos.id,
        newQuantity: totalQty,
        newAvgEntryPrice: newAvg,
        realizedPnl: 0,
        shouldClose: false,
      };
    }

    // Opposite direction — reduce or close or flip
    const priceDiff = fillPrice - pos.avg_entry_price;
    const pnlPerUnit = pos.side === 'LONG' ? priceDiff : -priceDiff;

    if (fillQuantity < pos.quantity) {
      // Partial close
      const realizedPnl = pnlPerUnit * fillQuantity;
      return {
        type: 'REDUCE',
        positionId: pos.id,
        newQuantity: pos.quantity - fillQuantity,
        newAvgEntryPrice: pos.avg_entry_price,
        realizedPnl,
        shouldClose: false,
      };
    }

    if (fillQuantity === pos.quantity) {
      // Full close
      const realizedPnl = pnlPerUnit * fillQuantity;
      return {
        type: 'CLOSE',
        positionId: pos.id,
        newQuantity: 0,
        newAvgEntryPrice: 0,
        realizedPnl,
        shouldClose: true,
      };
    }

    // Flip — close existing, open in opposite direction
    // Only allowed for majors
    if (!isMajor) {
      // For memecoins, just close fully (excess ignored)
      const realizedPnl = pnlPerUnit * pos.quantity;
      return {
        type: 'CLOSE',
        positionId: pos.id,
        newQuantity: 0,
        newAvgEntryPrice: 0,
        realizedPnl,
        shouldClose: true,
      };
    }

    const realizedPnl = pnlPerUnit * pos.quantity;
    const remainingQty = fillQuantity - pos.quantity;

    return {
      type: 'FLIP',
      positionId: pos.id,
      newQuantity: remainingQty,
      newAvgEntryPrice: fillPrice,
      realizedPnl,
      shouldClose: true, // Close old position, open new one
    };
  }

  /**
   * Compute unrealized PnL for a position given the current mark price.
   */
  computeUnrealizedPnl(
    side: 'LONG' | 'SHORT',
    quantity: number,
    entryPrice: number,
    markPrice: number,
  ): number {
    const priceDiff = markPrice - entryPrice;
    return side === 'LONG'
      ? priceDiff * quantity
      : -priceDiff * quantity;
  }
}
