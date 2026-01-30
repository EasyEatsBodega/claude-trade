import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataAdapter, Tick } from '../market-data.types';

// Kraken ticker pair mapping
const KRAKEN_PAIRS: Record<string, string> = {
  'MAJOR:BTC-USD': 'XXBTZUSD',
  'MAJOR:ETH-USD': 'XETHZUSD',
  'MAJOR:SOL-USD': 'SOLUSD',
  'MAJOR:AVAX-USD': 'AVAXUSD',
  'MAJOR:LINK-USD': 'LINKUSD',
  'MAJOR:DOGE-USD': 'XDGUSD',
  'MAJOR:ADA-USD': 'ADAUSD',
};

interface KrakenTickerResult {
  c: [string, string]; // last trade [price, lot volume]
  v: [string, string]; // volume [today, 24h]
}

interface KrakenResponse {
  error: string[];
  result: Record<string, KrakenTickerResult>;
}

@Injectable()
export class KrakenAdapter implements MarketDataAdapter {
  readonly name = 'kraken';
  private readonly logger = new Logger(KrakenAdapter.name);

  async fetchTicks(params: { symbols?: string[] }): Promise<Tick[]> {
    const symbolsToFetch = params.symbols?.filter((s) => s in KRAKEN_PAIRS) ??
      Object.keys(KRAKEN_PAIRS);

    if (symbolsToFetch.length === 0) return [];

    const krakenPairs = symbolsToFetch.map((s) => KRAKEN_PAIRS[s]);
    const pairParam = krakenPairs.join(',');

    try {
      const res = await fetch(
        `https://api.kraken.com/0/public/Ticker?pair=${pairParam}`,
      );
      const data: KrakenResponse = await res.json();

      if (data.error?.length > 0) {
        this.logger.warn(`Kraken API errors: ${data.error.join(', ')}`);
        return [];
      }

      const ticks: Tick[] = [];
      const now = Date.now();

      for (const symbol of symbolsToFetch) {
        const krakenPair = KRAKEN_PAIRS[symbol];
        const ticker = data.result[krakenPair];

        if (!ticker) continue;

        const price = parseFloat(ticker.c[0]);
        if (isNaN(price) || price <= 0) continue;

        ticks.push({
          symbol,
          price,
          volume24hUsd: parseFloat(ticker.v[1]) * price,
          source: this.name,
          ts: now,
        });
      }

      return ticks;
    } catch (err) {
      this.logger.error(`Kraken fetch failed: ${(err as Error).message}`);
      return [];
    }
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch('https://api.kraken.com/0/public/SystemStatus');
      const data = await res.json();
      const status = data.result?.status;
      return { ok: status === 'online', detail: `Status: ${status}` };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }
}
