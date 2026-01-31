import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Queue } from 'bullmq';
import * as jwt from 'jsonwebtoken';
import { createHmac, timingSafeEqual } from 'crypto';
import { AdminGuard } from './admin.guard';
import { RedisService } from '../redis/redis.service';
import { BotsService } from '../bots/bots.service';

@Controller('admin')
export class AdminController {
  private supabase: SupabaseClient;
  private botCycleQueue: Queue;

  constructor(
    private config: ConfigService,
    private redis: RedisService,
    private botsService: BotsService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );

    this.botCycleQueue = new Queue('bot-cycles', {
      connection: this.redis.getClient().duplicate(),
    });
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    const expectedUsername = this.config.get<string>('ADMIN_USERNAME');
    const expectedPassword = this.config.get<string>('ADMIN_PASSWORD');
    const jwtSecret = this.config.getOrThrow<string>('ADMIN_JWT_SECRET');

    if (!expectedUsername || !expectedPassword) {
      throw new HttpException('Admin not configured', HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Constant-time comparison to prevent timing attacks
    const usernameMatch =
      body.username.length === expectedUsername.length &&
      timingSafeEqual(
        createHmac('sha256', 'u').update(body.username).digest(),
        createHmac('sha256', 'u').update(expectedUsername).digest(),
      );

    const passwordMatch =
      body.password.length === expectedPassword.length &&
      timingSafeEqual(
        createHmac('sha256', 'p').update(body.password).digest(),
        createHmac('sha256', 'p').update(expectedPassword).digest(),
      );

    if (!usernameMatch || !passwordMatch) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: '24h' });
    return { token };
  }

  @Get('bots')
  @UseGuards(AdminGuard)
  async listBots() {
    const { data: bots } = await this.supabase
      .from('bots')
      .select(`
        id, name, model, is_active, created_at,
        bot_config(strategy_prompt),
        accounts(id, status, equity, cash)
      `)
      .order('created_at', { ascending: false });

    if (!bots) return [];

    // Check which bots have API keys
    const { data: secrets } = await this.supabase
      .from('bot_secrets')
      .select('bot_id');

    const botsWithKeys = new Set((secrets ?? []).map((s) => s.bot_id));

    return bots.map((bot: Record<string, unknown>) => {
      const config = bot.bot_config as Record<string, unknown> | null;
      const accounts = bot.accounts as Record<string, unknown>[] | null;
      const account = Array.isArray(accounts) ? accounts[0] : accounts;

      return {
        id: bot.id,
        name: bot.name,
        model: bot.model,
        isActive: bot.is_active,
        hasApiKey: botsWithKeys.has(bot.id as string),
        hasStrategy: !!(config as Record<string, unknown>)?.strategy_prompt,
        account: account
          ? {
              id: (account as Record<string, unknown>).id,
              status: (account as Record<string, unknown>).status,
              equity: Number((account as Record<string, unknown>).equity),
              cash: Number((account as Record<string, unknown>).cash),
            }
          : null,
        createdAt: bot.created_at,
      };
    });
  }

  @Post('bots/:id/force-cycle')
  @UseGuards(AdminGuard)
  async forceBotCycle(@Param('id') botId: string) {
    // Verify bot exists
    const { data: bot } = await this.supabase
      .from('bots')
      .select('id, name, is_active')
      .eq('id', botId)
      .single();

    if (!bot) {
      throw new HttpException('Bot not found', HttpStatus.NOT_FOUND);
    }

    // Push a one-shot job to the worker queue
    await this.botCycleQueue.add(
      'bot-cycle',
      { botId },
      {
        removeOnComplete: { count: 10 },
        removeOnFail: { count: 10 },
      },
    );

    return { success: true, message: `Cycle queued for ${bot.name}` };
  }

  @Patch('bots/:id/activate')
  @UseGuards(AdminGuard)
  async activateBot(@Param('id') botId: string) {
    // Admin force-activate: just set is_active = true, skip checks
    await this.supabase
      .from('bots')
      .update({ is_active: true })
      .eq('id', botId);

    return { success: true };
  }

  @Patch('bots/:id/deactivate')
  @UseGuards(AdminGuard)
  async deactivateBot(@Param('id') botId: string) {
    await this.supabase
      .from('bots')
      .update({ is_active: false })
      .eq('id', botId);

    return { success: true };
  }

  @Delete('bots/:id')
  @UseGuards(AdminGuard)
  async deleteBot(@Param('id') botId: string) {
    // Verify bot exists
    const { data: bot } = await this.supabase
      .from('bots')
      .select('id, name')
      .eq('id', botId)
      .single();

    if (!bot) {
      throw new HttpException('Bot not found', HttpStatus.NOT_FOUND);
    }

    // Delete related records that lack ON DELETE CASCADE
    await this.supabase.from('trade_posts').delete().eq('bot_id', botId);
    await this.supabase.from('leaderboard_snapshots').delete().eq('bot_id', botId);

    // Delete the bot itself (cascades to bot_config, bot_secrets, accounts → positions, orders, trades, equity_snapshots, account_events)
    await this.supabase.from('bots').delete().eq('id', botId);

    return { success: true, message: `Deleted bot ${bot.name}` };
  }

  @Get('stats')
  @UseGuards(AdminGuard)
  async getStats() {
    const [
      { count: totalBots },
      { count: activeBots },
      { count: totalTrades },
      { count: totalPosts },
    ] = await Promise.all([
      this.supabase.from('bots').select('*', { count: 'exact', head: true }),
      this.supabase.from('bots').select('*', { count: 'exact', head: true }).eq('is_active', true),
      this.supabase.from('trades').select('*', { count: 'exact', head: true }),
      this.supabase.from('trade_posts').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalBots: totalBots ?? 0,
      activeBots: activeBots ?? 0,
      totalTrades: totalTrades ?? 0,
      totalPosts: totalPosts ?? 0,
    };
  }
}
