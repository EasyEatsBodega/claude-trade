import { Injectable } from '@nestjs/common';
import {
  LEVERAGE_CAP,
  MAINTENANCE_RATIO,
  ZERO_EPSILON,
  MAJORS_ALLOWLIST,
} from '@claude-trade/shared';

export interface MarginCheck {
  notional: number;
  initialMarginReq: number;
  totalMarginUsed: number;
  maintenanceRequired: number;
  freeCollateral: number;
  canOpenPosition: boolean;
  reason?: string;
}

export interface TerminalCheck {
  isTerminal: boolean;
  reason?: 'ZEROED' | 'LIQUIDATED';
}

interface OpenPosition {
  symbol: string;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number;
  side: 'LONG' | 'SHORT';
}

@Injectable()
export class MarginCalculator {
  /**
   * Get the max leverage allowed for a symbol.
   */
  getMaxLeverage(symbol: string): number {
    return (MAJORS_ALLOWLIST as readonly string[]).includes(symbol)
      ? LEVERAGE_CAP
      : 1;
  }

  /**
   * Check if a new position can be opened given current account state.
   */
  checkMargin(
    equity: number,
    currentMarginUsed: number,
    newNotional: number,
    newLeverage: number,
    symbol: string,
  ): MarginCheck {
    const maxLeverage = this.getMaxLeverage(symbol);
    const effectiveLeverage = Math.min(newLeverage, maxLeverage);

    const initialMarginReq = newNotional / effectiveLeverage;
    const totalMarginUsed = currentMarginUsed + initialMarginReq;
    const maintenanceRequired = totalMarginUsed * MAINTENANCE_RATIO;
    const freeCollateral = equity - totalMarginUsed;

    let canOpen = true;
    let reason: string | undefined;

    if (newLeverage > maxLeverage) {
      canOpen = false;
      reason = `Leverage ${newLeverage}x exceeds max ${maxLeverage}x for ${symbol}`;
    } else if (freeCollateral < 0) {
      canOpen = false;
      reason = `Insufficient free collateral: need ${initialMarginReq.toFixed(2)}, have ${(equity - currentMarginUsed).toFixed(2)}`;
    } else if (equity < maintenanceRequired) {
      canOpen = false;
      reason = `Equity ${equity.toFixed(2)} below maintenance requirement ${maintenanceRequired.toFixed(2)}`;
    }

    return {
      notional: newNotional,
      initialMarginReq,
      totalMarginUsed,
      maintenanceRequired,
      freeCollateral,
      canOpenPosition: canOpen,
      reason,
    };
  }

  /**
   * Compute total margin used from open positions.
   */
  computeMarginUsed(positions: OpenPosition[]): number {
    let total = 0;
    for (const pos of positions) {
      if (!(MAJORS_ALLOWLIST as readonly string[]).includes(pos.symbol)) continue;
      const notional = Math.abs(pos.quantity) * pos.currentPrice;
      total += notional / LEVERAGE_CAP;
    }
    return total;
  }

  /**
   * Compute equity from cash + unrealized PnL.
   */
  computeEquity(cash: number, positions: OpenPosition[]): number {
    let unrealizedPnl = 0;
    for (const pos of positions) {
      const priceDiff = pos.currentPrice - pos.avgEntryPrice;
      const directedPnl =
        pos.side === 'LONG'
          ? priceDiff * Math.abs(pos.quantity)
          : -priceDiff * Math.abs(pos.quantity);
      unrealizedPnl += directedPnl;
    }
    return cash + unrealizedPnl;
  }

  /**
   * Check if account should transition to a terminal state.
   */
  checkTerminal(equity: number, marginUsed: number): TerminalCheck {
    if (equity <= ZERO_EPSILON) {
      return { isTerminal: true, reason: 'ZEROED' };
    }

    const maintenanceRequired = marginUsed * MAINTENANCE_RATIO;
    if (marginUsed > 0 && equity < maintenanceRequired) {
      return { isTerminal: true, reason: 'LIQUIDATED' };
    }

    return { isTerminal: false };
  }
}
