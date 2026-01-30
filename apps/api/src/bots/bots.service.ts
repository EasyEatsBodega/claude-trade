import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CryptoService } from '../crypto/crypto.service';
import { STARTING_BALANCE } from '@claude-trade/shared';
import { randomUUID } from 'crypto';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);
  private supabase: SupabaseClient;

  constructor(
    private config: ConfigService,
    private crypto: CryptoService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
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

    // If no competition ID provided, get the current active competition
    let competitionId = params.competitionId;
    if (!competitionId) {
      const { data: comp, error: compError } = await this.supabase
        .from('competitions')
        .select('id')
        .eq('status', 'active')
        .single();

      if (compError || !comp) {
        this.logger.error(`No active competition found: ${compError?.message}`);
        throw new Error('No active competition found');
      }
      competitionId = comp.id;
    }

    // Create bot
    const { data: bot, error } = await this.supabase
      .from('bots')
      .insert({
        user_id: userId,
        competition_id: competitionId,
        name: params.name,
        model: params.model ?? 'claude-sonnet-4-5-20250929',
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

    return bot;
  }

  async getBot(botId: string) {
    const { data } = await this.supabase
      .from('bots')
      .select(`
        *,
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

    await this.supabase
      .from('bot_secrets')
      .upsert(
        {
          bot_id: botId,
          encrypted_api_key: ciphertext,
          key_iv: iv,
          key_auth_tag: authTag,
          key_version: 1,
        },
        { onConflict: 'bot_id' },
      );

    return { success: true, message: 'API key stored securely' };
  }

  /**
   * Internal only — decrypt API key for bot runner.
   */
  async decryptApiKey(botId: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('bot_secrets')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (!data) return null;

    return this.crypto.decrypt(
      Buffer.from(data.encrypted_api_key),
      Buffer.from(data.key_iv),
      Buffer.from(data.key_auth_tag),
    );
  }

  async activateBot(botId: string) {
    // Check bot has API key and strategy prompt
    const { data: secret } = await this.supabase
      .from('bot_secrets')
      .select('id')
      .eq('bot_id', botId)
      .single();

    if (!secret) {
      throw new Error('Bot must have an API key before activation');
    }

    const { data: config } = await this.supabase
      .from('bot_config')
      .select('strategy_prompt')
      .eq('bot_id', botId)
      .single();

    if (!config?.strategy_prompt) {
      throw new Error('Bot must have a strategy prompt before activation');
    }

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
}
