import { Injectable, Logger } from '@nestjs/common';
import { UNIVERSE_FILTERS, MEMECOIN_CHAINS } from '@claude-trade/shared';
import type { MarketDataAdapter, Tick, UniverseToken } from '../market-data.types';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    symbol: string;
  };
  priceUsd: string;
  liquidity: { usd: number };
  volume: { h24: number };
  pairCreatedAt: number;
}

interface DexScreenerSearchResponse {
  pairs: DexScreenerPair[];
}

interface DexScreenerTokenResponse {
  pairs: DexScreenerPair[];
}

@Injectable()
export class DexScreenerAdapter implements MarketDataAdapter {
  readonly name = 'dexscreener';
  private readonly logger = new Logger(DexScreenerAdapter.name);

  async fetchTicks(params: { symbols?: string[] }): Promise<Tick[]> {
    if (!params.symbols || params.symbols.length === 0) return [];

    // Only handle memecoin symbols (SOL:xxx or BASE:xxx)
    const memecoinSymbols = params.symbols.filter(
      (s) => s.startsWith('SOL:') || s.startsWith('BASE:'),
    );

    if (memecoinSymbols.length === 0) return [];

    const ticks: Tick[] = [];
    const now = Date.now();

    // Batch by chain — DexScreener supports multi-address lookup
    const solanaAddrs = memecoinSymbols
      .filter((s) => s.startsWith('SOL:'))
      .map((s) => s.slice(4));

    const baseAddrs = memecoinSymbols
      .filter((s) => s.startsWith('BASE:'))
      .map((s) => s.slice(5));

    const fetchChain = async (
      chain: string,
      addresses: string[],
      prefix: string,
    ) => {
      if (addresses.length === 0) return;

      // DexScreener supports up to ~30 addresses per call
      for (let i = 0; i < addresses.length; i += 30) {
        const batch = addresses.slice(i, i + 30);
        try {
          const res = await fetch(
            `https://api.dexscreener.com/tokens/v1/${chain}/${batch.join(',')}`,
          );

          if (!res.ok) {
            this.logger.warn(`DexScreener ${chain} returned ${res.status}`);
            continue;
          }

          const pairs: DexScreenerPair[] = await res.json();

          // For each address, pick the pair with highest liquidity
          const bestPairs = new Map<string, DexScreenerPair>();
          for (const pair of pairs) {
            const addr = pair.baseToken.address;
            const existing = bestPairs.get(addr);
            if (!existing || pair.liquidity.usd > existing.liquidity.usd) {
              bestPairs.set(addr, pair);
            }
          }

          for (const [addr, pair] of bestPairs) {
            const price = parseFloat(pair.priceUsd);
            if (isNaN(price) || price <= 0) continue;

            ticks.push({
              symbol: `${prefix}:${addr}`,
              price,
              liquidityUsd: pair.liquidity.usd,
              volume24hUsd: pair.volume.h24,
              source: this.name,
              ts: now,
            });
          }
        } catch (err) {
          this.logger.error(
            `DexScreener ${chain} fetch failed: ${(err as Error).message}`,
          );
        }
      }
    };

    await Promise.all([
      fetchChain('solana', solanaAddrs, 'SOL'),
      fetchChain('base', baseAddrs, 'BASE'),
    ]);

    return ticks;
  }

  /**
   * Discover top memecoins on Solana + Base that meet the universe filters.
   */
  async discoverUniverse(): Promise<UniverseToken[]> {
    const tokens: UniverseToken[] = [];

    for (const chain of MEMECOIN_CHAINS) {
      try {
        // Use DexScreener's token-profiles or search endpoint
        const res = await fetch(
          `https://api.dexscreener.com/token-boosts/top/v1`,
        );

        if (!res.ok) {
          this.logger.warn(`DexScreener discovery ${chain} returned ${res.status}`);
          continue;
        }

        const data: { tokenAddress: string; chainId: string; url: string }[] =
          await res.json();

        // Filter to our chains and fetch detailed pair data
        const chainTokens = data.filter((t) => t.chainId === chain);

        for (const token of chainTokens.slice(0, 50)) {
          try {
            const pairRes = await fetch(
              `https://api.dexscreener.com/tokens/v1/${chain}/${token.tokenAddress}`,
            );

            if (!pairRes.ok) continue;

            const pairs: DexScreenerPair[] = await pairRes.json();
            if (!pairs || pairs.length === 0) continue;

            // Pick best pair by liquidity
            const bestPair = pairs.reduce((a, b) =>
              a.liquidity.usd > b.liquidity.usd ? a : b,
            );

            const price = parseFloat(bestPair.priceUsd);
            if (isNaN(price) || price <= 0) continue;

            // Apply universe filters
            const now = Date.now();
            const pairAge = now - bestPair.pairCreatedAt;

            if (bestPair.liquidity.usd < UNIVERSE_FILTERS.MIN_LIQUIDITY_USD) continue;
            if (bestPair.volume.h24 < UNIVERSE_FILTERS.MIN_VOLUME_24H_USD) continue;
            if (pairAge < UNIVERSE_FILTERS.MIN_PAIR_AGE_MS) continue;

            const prefix = chain === 'solana' ? 'SOL' : 'BASE';
            tokens.push({
              symbol: `${prefix}:${bestPair.baseToken.address}`,
              chain,
              address: bestPair.baseToken.address,
              name: bestPair.baseToken.name,
              isMajor: false,
              liquidityUsd: bestPair.liquidity.usd,
              volume24hUsd: bestPair.volume.h24,
              pairCreatedAt: new Date(bestPair.pairCreatedAt).toISOString(),
            });
          } catch {
            // Skip individual token errors
          }
        }
      } catch (err) {
        this.logger.error(
          `DexScreener discovery ${chain} failed: ${(err as Error).message}`,
        );
      }
    }

    return tokens;
  }

  async healthCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch('https://api.dexscreener.com/tokens/v1/solana/So11111111111111111111111111111111111111112');
      return { ok: res.ok, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: (err as Error).message };
    }
  }
}
