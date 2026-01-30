import { Injectable } from '@nestjs/common';
import { FEES, SLIPPAGE, MAJORS_ALLOWLIST } from '@claude-trade/shared';

export interface FeeResult {
  feeBps: number;
  feeAmount: number;
  slippageBps: number;
  fillPrice: number;
}

@Injectable()
export class FeeCalculator {
  /**
   * Calculate fees and slippage for a fill.
   * @param markPrice - the current mark price
   * @param quantity - unsigned quantity
   * @param symbol - canonical symbol
   * @param side - BUY or SELL
   * @param liquidityUsd - liquidity for memecoin slippage scaling
   */
  calculate(
    markPrice: number,
    quantity: number,
    symbol: string,
    side: 'BUY' | 'SELL',
    liquidityUsd?: number,
  ): FeeResult {
    const isMajor = (MAJORS_ALLOWLIST as readonly string[]).includes(symbol);
    const notional = quantity * markPrice;

    // Fee
    const feeBps = isMajor ? FEES.MAJORS_BPS : FEES.MEMECOINS_BPS;
    const feeAmount = (notional * feeBps) / 10_000;

    // Slippage
    let slippageBps: number;
    if (isMajor) {
      slippageBps = SLIPPAGE.MAJORS_BPS;
    } else {
      // For memecoins, slippage scales with notional relative to liquidity
      const baseBps = SLIPPAGE.MEMECOINS_BASE_BPS;
      if (liquidityUsd && liquidityUsd > 0) {
        const impactFactor = notional / liquidityUsd;
        slippageBps = Math.min(
          baseBps + impactFactor * 100 * 100, // 100 bps per 1% of liquidity
          SLIPPAGE.MAX_BPS,
        );
      } else {
        slippageBps = baseBps;
      }
    }

    // Fill price: adverse direction for the trader
    const slippageMultiplier = slippageBps / 10_000;
    const fillPrice =
      side === 'BUY'
        ? markPrice * (1 + slippageMultiplier)
        : markPrice * (1 - slippageMultiplier);

    return { feeBps, feeAmount, slippageBps, fillPrice };
  }
}
