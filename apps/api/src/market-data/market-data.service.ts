import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RedisService } from '../redis/redis.service';
import { OutlierDetector } from './outlier-detector';
import { KrakenAdapter } from './sources/kraken.source';
import { CoinbaseAdapter } from './sources/coinbase.source';
import { DexScreenerAdapter } from './sources/dexscreener.source';
import { MAJORS_ALLOWLIST, PRICE_STALENESS_MS } from '@claude-trade/shared';
import type { Tick, UniverseToken } from './market-data.types';

const PRICE_CACHE_TTL = 30; // seconds
const UNIVERSE_CACHE_TTL = 600; // seconds

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private supabase: SupabaseClient;

  constructor(
    private redis: RedisService,
    private outlierDetector: OutlierDetector,
    private krakenAdapter: KrakenAdapter,
    private coinbaseAdapter: CoinbaseAdapter,
    private dexscreenerAdapter: DexScreenerAdapter,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  /**
   * Fetch and process ticks for all majors.
   * Uses two sources (Kraken + Coinbase) and takes median.
   */
  async fetchMajorsTicks(): Promise<Tick[]> {
    const symbols = [...MAJORS_ALLOWLIST] as string[];

    const [krakenTicks, coinbaseTicks] = await Promise.all([
      this.krakenAdapter.fetchTicks({ symbols }),
      this.coinbaseAdapter.fetchTicks({ symbols }),
    ]);

    const validTicks: Tick[] = [];
    const now = Date.now();

    for (const symbol of symbols) {
      const kTick = krakenTicks.find((t) => t.symbol === symbol);
      const cTick = coinbaseTicks.find((t) => t.symbol === symbol);

      let markPrice: number | null = null;
      let source = 'kraken';

      if (kTick && cTick) {
        // Both available — use median (with 2 values, it's the average)
        markPrice = (kTick.price + cTick.price) / 2;
        source = 'median:kraken+coinbase';

        // Check divergence
        const divergencePct =
          (Math.abs(kTick.price - cTick.price) / Math.min(kTick.price, cTick.price)) * 100;
        if (divergencePct > 2) {
          this.logger.warn(
            `Source divergence for ${symbol}: Kraken=${kTick.price} Coinbase=${cTick.price} (${divergencePct.toFixed(1)}%)`,
          );
        }
      } else if (kTick) {
        markPrice = kTick.price;
        source = 'kraken';
      } else if (cTick) {
        markPrice = cTick.price;
        source = 'coinbase';
      }

      if (markPrice === null) continue;

      const tick: Tick = {
        symbol,
        price: markPrice,
        volume24hUsd: kTick?.volume24hUsd ?? cTick?.volume24hUsd,
        source,
        ts: now,
      };

      const { valid } = await this.outlierDetector.validate(tick);
      if (valid) {
        validTicks.push(tick);
      }
    }

    // Persist and cache
    await this.persistTicks(validTicks);
    await this.cacheTicks(validTicks);

    return validTicks;
  }

  /**
   * Fetch and process ticks for memecoins in the current universe.
   */
  async fetchMemecoinTicks(): Promise<Tick[]> {
    const universe = await this.getUniverse();
    const memecoinSymbols = universe
      .filter((t) => !t.isMajor)
      .map((t) => t.symbol);

    if (memecoinSymbols.length === 0) return [];

    const ticks = await this.dexscreenerAdapter.fetchTicks({
      symbols: memecoinSymbols,
    });

    const validTicks: Tick[] = [];

    for (const tick of ticks) {
      const { valid } = await this.outlierDetector.validate(tick);
      if (valid) {
        validTicks.push(tick);
      }
    }

    await this.persistTicks(validTicks);
    await this.cacheTicks(validTicks);

    return validTicks;
  }

  /**
   * Refresh the tradable memecoin universe via DexScreener discovery.
   */
  async refreshUniverse(): Promise<UniverseToken[]> {
    this.logger.log('Refreshing memecoin universe...');

    const discoveredTokens = await this.dexscreenerAdapter.discoverUniverse();
    this.logger.log(`Discovered ${discoveredTokens.length} eligible memecoins`);

    // Build full universe: majors + discovered memecoins
    const majors: UniverseToken[] = MAJORS_ALLOWLIST.map((symbol) => ({
      symbol,
      name: symbol.replace('MAJOR:', '').replace('-USD', ''),
      isMajor: true,
    }));

    const fullUniverse = [...majors, ...discoveredTokens];

    // Persist to DB
    for (const token of fullUniverse) {
      await this.supabase.from('tradable_universe').upsert(
        {
          symbol: token.symbol,
          chain: token.chain ?? null,
          address: token.address ?? null,
          name: token.name,
          is_major: token.isMajor,
          liquidity_usd: token.liquidityUsd ?? null,
          volume_24h_usd: token.volume24hUsd ?? null,
          pair_created_at: token.pairCreatedAt ?? null,
          last_refreshed_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: 'symbol' },
      );
    }

    // Cache in Redis
    await this.redis.setJson('universe:current', fullUniverse, UNIVERSE_CACHE_TTL);

    return fullUniverse;
  }

  /**
   * Get the current tradable universe (from cache or DB).
   */
  async getUniverse(): Promise<UniverseToken[]> {
    // Try cache first
    const cached = await this.redis.getJson<UniverseToken[]>('universe:current');
    if (cached) return cached;

    // Fall back to DB
    const { data } = await this.supabase
      .from('tradable_universe')
      .select('*')
      .eq('is_active', true);

    if (!data || data.length === 0) {
      // Return just majors as default
      const majors: UniverseToken[] = MAJORS_ALLOWLIST.map((symbol) => ({
        symbol,
        name: symbol.replace('MAJOR:', '').replace('-USD', ''),
        isMajor: true,
      }));
      await this.redis.setJson('universe:current', majors, UNIVERSE_CACHE_TTL);
      return majors;
    }

    const universe: UniverseToken[] = data.map((row) => ({
      symbol: row.symbol,
      chain: row.chain,
      address: row.address,
      name: row.name,
      isMajor: row.is_major,
      liquidityUsd: row.liquidity_usd,
      volume24hUsd: row.volume_24h_usd,
      pairCreatedAt: row.pair_created_at,
    }));

    await this.redis.setJson('universe:current', universe, UNIVERSE_CACHE_TTL);
    return universe;
  }

  /**
   * Get a quote for a specific symbol (from cache or return null if stale).
   */
  async getQuote(symbol: string): Promise<Tick | null> {
    const cached = await this.redis.getJson<Tick>(`price:${symbol}`);
    if (!cached) return null;

    if (Date.now() - cached.ts > PRICE_STALENESS_MS) {
      return null; // Stale
    }

    return cached;
  }

  /**
   * Get quotes for multiple symbols.
   */
  async getQuotes(symbols: string[]): Promise<Record<string, Tick | null>> {
    const result: Record<string, Tick | null> = {};
    await Promise.all(
      symbols.map(async (s) => {
        result[s] = await this.getQuote(s);
      }),
    );
    return result;
  }

  /**
   * Health check across all adapters.
   */
  async healthCheck() {
    const [kraken, coinbase, dexscreener] = await Promise.all([
      this.krakenAdapter.healthCheck(),
      this.coinbaseAdapter.healthCheck(),
      this.dexscreenerAdapter.healthCheck(),
    ]);
    return { kraken, coinbase, dexscreener };
  }

  private async persistTicks(ticks: Tick[]): Promise<void> {
    if (ticks.length === 0) return;

    const rows = ticks.map((t) => ({
      symbol: t.symbol,
      price: t.price,
      source: t.source,
      liquidity_usd: t.liquidityUsd ?? null,
      volume_24h_usd: t.volume24hUsd ?? null,
      is_suspect: false,
      tick_at: new Date(t.ts).toISOString(),
    }));

    const { error } = await this.supabase.from('price_ticks').insert(rows);
    if (error) {
      this.logger.error(`Failed to persist ticks: ${error.message}`);
    }
  }

  private async cacheTicks(ticks: Tick[]): Promise<void> {
    await Promise.all(
      ticks.map((t) => this.redis.setJson(`price:${t.symbol}`, t, PRICE_CACHE_TTL)),
    );
  }
}
