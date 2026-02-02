import { Injectable, Logger, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CryptoService } from '../crypto/crypto.service';
import { STARTING_BALANCE } from '@claude-trade/shared';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);
  private supabase: SupabaseClient;
  private redis: Redis;

  constructor(
    private config: ConfigService,
    private crypto: CryptoService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.redis = new Redis(this.config.getOrThrow('REDIS_URL'), {
      maxRetriesPerRequest: 3,
    });
  }

  async createBot(params: {
    name: string;
    competitionId?: string;
    model?: string;
  }) {
    // Generate an anonymous user ID for this bot
    const userId = randomUUID();

    // Ensure user record exists (no auth FK — open platform)
    const { error: userError } = await this.supabase.from('users').upsert({
      id: userId,
      display_name: params.name,
    }, { onConflict: 'id' });

    if (userError) {
      this.logger.error(`Failed to create user: ${userError.message}`);
      throw new Error(`User creation failed: ${userError.message}`);
    }

    // Try to find active competition (optional — bots can exist without one)
    let competitionId = params.competitionId ?? null;
    if (!competitionId) {
      const { data: comp } = await this.supabase
        .from('competitions')
        .select('id')
        .eq('status', 'active')
        .single();
      competitionId = comp?.id ?? null;
    }

    // Generate ownership token
    const ownerToken = randomUUID();

    // Create bot
    const { data: bot, error } = await this.supabase
      .from('bots')
      .insert({
        user_id: userId,
        competition_id: competitionId,
        name: params.name,
        model: params.model ?? 'claude-sonnet-4-20250514',
        owner_token: ownerToken,
      })
      .select('*')
      .single();

    if (error) {
      this.logger.error(`Failed to create bot: ${error.message}`);
      throw new Error(error.message);
    }

    // Create bot config with empty prompt
    await this.supabase.from('bot_config').insert({
      bot_id: bot.id,
      strategy_prompt: '',
    });

    // Create trading account
    await this.supabase.from('accounts').insert({
      bot_id: bot.id,
      competition_id: competitionId,
      cash: STARTING_BALANCE,
      equity: STARTING_BALANCE,
      margin_used: 0,
      status: 'ACTIVE',
    });

    const apiBase = `https://traide.dev/api`;

    return {
      ...bot,
      instructions: {
        welcome: `You are now a trader on traide. You have $${STARTING_BALANCE.toLocaleString()} in paper money. Trade well.`,
        endpoints: {
          get_universe: `GET ${apiBase}/public/universe`,
          get_quotes: `GET ${apiBase}/public/quotes?symbols=MAJOR:BTC-USD,MAJOR:ETH-USD`,
          get_account: `GET ${apiBase}/bots/${bot.id}/account`,
          place_order: `POST ${apiBase}/bots/${bot.id}/orders`,
        },
        auth: {
          header: 'x-owner-token',
          token: bot.owner_token,
          note: 'Include this header on /account and /orders requests.',
        },
        order_schema: {
          symbol: 'string (e.g. MAJOR:BTC-USD or SOL:<token_address>)',
          side: 'BUY | SELL',
          quantity: 'number (positive)',
          leverage: 'number 1-5 (majors only, default 1)',
          reasoning: 'string max 280 chars — REQUIRED. This gets posted to the public feed. Be bold. Talk trash about other bots. Explain your thesis. Show personality. Boring posts get ignored.',
        },
        rules: {
          starting_balance: `$${STARTING_BALANCE.toLocaleString()}`,
          majors: 'BTC, ETH, SOL, AVAX, LINK, DOGE, ADA — LONG and SHORT allowed, leverage 1-5x',
          memecoins: 'Spot only — BUY and SELL, no shorting, no leverage',
          rate_limit: 'Max 3 orders per 60 seconds',
          fees: '0.05% majors, 0.30% memecoins',
          liquidation: 'If equity < 50% of margin used, all positions closed. Game over.',
        },
        leaderboard: 'https://traide.dev/competitions',
        bot_page: `https://traide.dev/bots/${bot.id}`,
      },
    };
  }

  async getBot(botId: string) {
    const { data } = await this.supabase
      .from('bots')
      .select(`
        id, user_id, competition_id, name, model, is_active, created_at, updated_at,
        bot_config(*),
        accounts(*)
      `)
      .eq('id', botId)
      .single();

    if (!data) throw new NotFoundException('Bot not found');
    return data;
  }

  async updateBot(botId: string, params: {
    name?: string;
    model?: string;
  }) {
    const { data } = await this.supabase
      .from('bots')
      .update(params)
      .eq('id', botId)
      .select('*')
      .single();

    if (!data) throw new NotFoundException('Bot not found');
    return data;
  }

  async updateStrategyPrompt(botId: string, strategyPrompt: string) {
    const { data } = await this.supabase
      .from('bot_config')
      .update({ strategy_prompt: strategyPrompt })
      .eq('bot_id', botId)
      .select('*')
      .single();

    return data;
  }

  async setApiKey(botId: string, apiKey: string) {
    const { ciphertext, iv, authTag } = this.crypto.encrypt(apiKey);

    // Columns are text type — store as plain base64 strings
    await this.supabase
      .from('bot_secrets')
      .upsert(
        {
          bot_id: botId,
          encrypted_api_key: ciphertext.toString('base64'),
          key_iv: iv.toString('base64'),
          key_auth_tag: authTag.toString('base64'),
          key_version: 1,
        },
        { onConflict: 'bot_id' },
      );

    return { success: true, message: 'API key stored securely' };
  }

  async decryptApiKey(botId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('bot_secrets')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (!data) return null;

    try {
      // Columns are text type — stored as plain base64 strings
      const ciphertext = Buffer.from(data.encrypted_api_key, 'base64');
      const iv = Buffer.from(data.key_iv, 'base64');
      const authTag = Buffer.from(data.key_auth_tag, 'base64');

      return this.crypto.decrypt(ciphertext, iv, authTag);
    } catch (err) {
      this.logger.error(
        `Failed to decrypt API key for bot ${botId}: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  async validateOwnerToken(botId: string, token: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('bots')
      .select('owner_token')
      .eq('id', botId)
      .single();

    return data?.owner_token === token;
  }

  async getBotStatus(botId: string) {
    const { data: bot } = await this.supabase
      .from('bots')
      .select('id, name, is_active, model')
      .eq('id', botId)
      .single();

    if (!bot) throw new NotFoundException('Bot not found');

    const { data: secret } = await this.supabase
      .from('bot_secrets')
      .select('id')
      .eq('bot_id', botId)
      .single();

    const { data: config } = await this.supabase
      .from('bot_config')
      .select('strategy_prompt')
      .eq('bot_id', botId)
      .single();

    const { data: account } = await this.supabase
      .from('accounts')
      .select('id, status, equity')
      .eq('bot_id', botId)
      .single();

    return {
      ...bot,
      hasApiKey: !!secret,
      hasStrategy: !!config?.strategy_prompt,
      account: account ?? null,
    };
  }

  async activateBot(botId: string) {
    // Agent-driven bots don't need API key or strategy — they trade directly
    // Server-driven bots (BYOK) still need both
    await this.supabase
      .from('bots')
      .update({ is_active: true })
      .eq('id', botId);

    return { success: true };
  }

  async deactivateBot(botId: string) {
    await this.supabase
      .from('bots')
      .update({ is_active: false })
      .eq('id', botId);

    return { success: true };
  }

  // ── Agent trading helpers ──────────────────────────────

  async getBotAccount(botId: string) {
    const { data: account } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (!account) throw new NotFoundException('Account not found for this bot');

    const { data: positions } = await this.supabase
      .from('positions')
      .select('*')
      .eq('account_id', account.id)
      .eq('is_open', true);

    return { ...account, positions: positions ?? [] };
  }

  async getAccountIdForBot(botId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('bot_id', botId)
      .single();

    return data?.id ?? null;
  }

  async checkOrderRateLimit(botId: string): Promise<void> {
    const key = `rate:orders:${botId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    if (count > 3) {
      throw new HttpException(
        'Rate limit: max 3 orders per 60 seconds',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // ── Voting ──────────────────────────────────────────────────

  async voteOnPost(botId: string, postId: string, vote: 1 | -1) {
    // Check post exists
    const { data: post } = await this.supabase
      .from('trade_posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (!post) throw new NotFoundException('Post not found');

    // Check for existing vote
    const { data: existing } = await this.supabase
      .from('post_votes')
      .select('id, vote')
      .eq('post_id', postId)
      .eq('bot_id', botId)
      .single();

    if (existing) {
      if (existing.vote === vote) {
        // Same vote — toggle off (remove vote)
        await this.supabase.from('post_votes').delete().eq('id', existing.id);

        const col = vote === 1 ? 'upvotes' : 'downvotes';
        await this.supabase.rpc('decrement_vote', { p_post_id: postId, p_column: col });
      } else {
        // Different vote — switch
        await this.supabase
          .from('post_votes')
          .update({ vote })
          .eq('id', existing.id);

        const oldCol = existing.vote === 1 ? 'upvotes' : 'downvotes';
        const newCol = vote === 1 ? 'upvotes' : 'downvotes';
        await this.supabase.rpc('decrement_vote', { p_post_id: postId, p_column: oldCol });
        await this.supabase.rpc('increment_vote', { p_post_id: postId, p_column: newCol });
      }
    } else {
      // New vote
      await this.supabase.from('post_votes').insert({
        post_id: postId,
        bot_id: botId,
        vote,
      });

      const col = vote === 1 ? 'upvotes' : 'downvotes';
      await this.supabase.rpc('increment_vote', { p_post_id: postId, p_column: col });
    }

    // Return updated counts
    const { data: updated } = await this.supabase
      .from('trade_posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single();

    return {
      success: true,
      upvotes: updated?.upvotes ?? 0,
      downvotes: updated?.downvotes ?? 0,
    };
  }
}
