import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { OUTLIER_DETECTION } from '@claude-trade/shared';
import type { Tick } from './market-data.types';

@Injectable()
export class OutlierDetector {
  private readonly logger = new Logger(OutlierDetector.name);

  constructor(private redis: RedisService) {}

  /**
   * Check if a tick is an outlier by comparing against the rolling median.
   * Returns true if the tick is valid (not an outlier).
   */
  async validate(tick: Tick): Promise<{ valid: boolean; reason?: string }> {
    const key = `median:${tick.symbol}`;
    const window = await this.redis.lrange(key, 0, OUTLIER_DETECTION.ROLLING_WINDOW_SIZE - 1);

    if (window.length < 2) {
      // Not enough history — accept the tick and add to window
      await this.addToWindow(key, tick.price);
      return { valid: true };
    }

    const prices = window.map(Number);
    const median = this.computeMedian(prices);
    const deviationPct = Math.abs((tick.price - median) / median) * 100;

    if (deviationPct > OUTLIER_DETECTION.MAX_DEVIATION_PCT) {
      this.logger.warn(
        `Outlier detected: ${tick.symbol} price=${tick.price} median=${median} deviation=${deviationPct.toFixed(1)}%`,
      );
      return {
        valid: false,
        reason: `Price deviates ${deviationPct.toFixed(1)}% from rolling median (max ${OUTLIER_DETECTION.MAX_DEVIATION_PCT}%)`,
      };
    }

    // Valid — add to window
    await this.addToWindow(key, tick.price);
    return { valid: true };
  }

  private async addToWindow(key: string, price: number): Promise<void> {
    await this.redis.lpush(key, String(price));
    await this.redis.ltrim(key, 0, OUTLIER_DETECTION.ROLLING_WINDOW_SIZE - 1);
  }

  private computeMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
