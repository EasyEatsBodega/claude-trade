import { Injectable, Logger } from '@nestjs/common';
import type { MarketDataAdapter, Tick } from '../market-data.types';

// Coinbase product mapping
const COINBASE_PRODUCTS: Record<string, string> = {
  'MAJOR:BTC-USD': 'BTC-USD',
  'MAJOR:ETH-USD': 'ETH-USD',
  'MAJOR:SOL-USD': 'SOL-USD',
  'MAJOR:AVAX-USD': 'AVAX-USD',
  'MAJOR:LINK-USD': 'LINK-USD',
  'MAJOR:DOGE-USD': 'DOGE-USD',
  'MAJOR:ADA-USD': 'ADA-USD',
};

interface CoinbaseTickerResponse {
  price: string;
  volume: string;
  time: string;
}

@Injectable()
export class CoinbaseAdapter implements MarketDataAdapter {
  readonly name = 'coinbase';
  private readonly logger = new Logger(CoinbaseAdapter.name);

  async fetchTicks(params: { symbols?: string[] }): Promise<Tick[]> {
    const symbolsToFetch = params.symbols?.filter((s) => s in COINBASE_PRODUCTS) ??
      Object.keys(COINBASE_PRODUCTS);

    if (symbolsToFetch.length === 0) return [];

    const ticks: Tick[] = [];
    const now = Date.now();

    // Coinbase requires individual requests per product
    const results = await Promise.allSettled(
      symbolsToFetch.map(async (symbol) => {
        const product = COINBASE_PRODUCTS[symbol];
        const res = await fetch(
          `https://api.exchange.coinbase.com/products/${product}/ticker`,
          { headers: { 'User-Agent': 'ClaudeTrade/1.0' } },
        );

        if (!res.ok) return null;

        const data: CoinbaseTickerResponse = await res.json();
        const price = parseFloat(data.price);

        if (isNaN(price) || price <= 0) return null;

        return {
          symbol,
          price,
          volume24hUsd: parseFloat(data.volume) * price,
          source: this.name,
          ts: now,
        } satisfies Tick;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        ticks.push(result.value);
      }
    }

    return ticks;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch('https://api.exchange.coinbase.com/time');
      return { ok: res.ok, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }
}
