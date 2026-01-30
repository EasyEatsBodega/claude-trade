import { Injectable } from '@nestjs/common';
import { MAJORS_ALLOWLIST, PRICE_STALENESS_MS } from '@claude-trade/shared';
import type { Tick } from '../market-data/market-data.types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

interface AccountState {
  status: string;
  equity: number;
  cash: number;
  marginUsed: number;
}

interface PositionInfo {
  symbol: string;
  quantity: number;
  side: 'LONG' | 'SHORT';
  isOpen: boolean;
}

@Injectable()
export class OrderValidator {
  /**
   * Run all validation checks on an order before execution.
   */
  validate(params: {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: number;
    leverage: number;
    account: AccountState;
    positions: PositionInfo[];
    quote: Tick | null;
    tradableSymbols: string[];
  }): ValidationResult {
    const { symbol, side, quantity, leverage, account, positions, quote, tradableSymbols } = params;

    // 1. Account must be ACTIVE
    if (account.status !== 'ACTIVE') {
      return { valid: false, reason: `ACCOUNT_${account.status}` };
    }

    // 2. Quantity must be positive
    if (quantity <= 0) {
      return { valid: false, reason: 'INVALID_QUANTITY' };
    }

    // 3. Symbol must be tradable
    if (!tradableSymbols.includes(symbol)) {
      return { valid: false, reason: `SYMBOL_NOT_TRADABLE: ${symbol}` };
    }

    // 4. Quote must exist and not be stale
    if (!quote) {
      return { valid: false, reason: 'NO_QUOTE_AVAILABLE' };
    }
    if (Date.now() - quote.ts > PRICE_STALENESS_MS) {
      return { valid: false, reason: 'QUOTE_STALE' };
    }

    // 5. Asset-specific rules
    const isMajor = (MAJORS_ALLOWLIST as readonly string[]).includes(symbol);

    if (!isMajor) {
      // Memecoin rules: spot only, no shorting
      if (leverage > 1) {
        return { valid: false, reason: 'MEMECOIN_NO_LEVERAGE' };
      }

      if (side === 'SELL') {
        // Must own the token to sell
        const ownedPosition = positions.find(
          (p) => p.symbol === symbol && p.isOpen && p.side === 'LONG',
        );
        if (!ownedPosition || ownedPosition.quantity < quantity) {
          return {
            valid: false,
            reason: 'MEMECOIN_SELL_REQUIRES_OWNERSHIP',
          };
        }
      }
    }

    // 6. Leverage check
    const maxLeverage = isMajor ? 5 : 1;
    if (leverage > maxLeverage) {
      return {
        valid: false,
        reason: `LEVERAGE_EXCEEDS_MAX: ${leverage}x > ${maxLeverage}x`,
      };
    }

    return { valid: true };
  }
}
