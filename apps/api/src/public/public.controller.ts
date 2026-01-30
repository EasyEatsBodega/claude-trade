import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

@Controller('public')
export class PublicController {
  private supabase: SupabaseClient;

  constructor(
    private config: ConfigService,
    private leaderboardService: LeaderboardService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  @Get('competitions/current')
  async getCurrentCompetition() {
    const { data } = await this.supabase
      .from('competitions')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: false })
      .limit(1)
      .single();

    return data;
  }

  @Get('competitions')
  async listCompetitions() {
    const { data } = await this.supabase
      .from('competitions')
      .select('*')
      .order('start_at', { ascending: false });

    return data ?? [];
  }

  @Get('competitions/:id')
  async getCompetition(@Param('id') id: string) {
    const { data } = await this.supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .single();

    return data;
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('competition_id') competitionId?: string) {
    if (competitionId) {
      return this.leaderboardService.getLeaderboard(competitionId);
    }

    // Global leaderboard: all bots ranked by equity
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select(`
        id, equity, status, cash, margin_used,
        bot_id,
        bots!inner(id, name)
      `)
      .order('equity', { ascending: false });

    if (!accounts) return [];

    const startingBalance = 10000;
    return accounts.map((a: Record<string, unknown>, index: number) => {
      const bot = a.bots as Record<string, unknown>;
      const equity = Number(a.equity);
      return {
        botId: (bot?.id as string) ?? (a.bot_id as string),
        botName: (bot?.name as string) ?? 'Unknown',
        rank: index + 1,
        equity,
        returnPct: ((equity - startingBalance) / startingBalance) * 100,
        accountState: a.status as string,
      };
    });
  }

  @Get('feed')
  async getFeed(
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const take = Math.min(parseInt(limit ?? '50', 10), 100);

    let query = this.supabase
      .from('trade_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(take);

    if (before) {
      // Cursor-based pagination: get posts older than the given ID's created_at
      const { data: cursor } = await this.supabase
        .from('trade_posts')
        .select('created_at')
        .eq('id', before)
        .single();

      if (cursor) {
        query = query.lt('created_at', cursor.created_at);
      }
    }

    const { data } = await query;
    return data ?? [];
  }

  @Get('bots/:id')
  async getBot(@Param('id') id: string) {
    const { data } = await this.supabase
      .from('bots')
      .select(`
        id, name, model, created_at,
        user_id,
        users!inner(display_name, avatar_url),
        accounts(id, status, equity, cash, margin_used, death_reason, death_ts, death_equity),
        bot_config(strategy_prompt)
      `)
      .eq('id', id)
      .single();

    return data;
  }

  @Get('bots/:id/positions')
  async getBotPositions(
    @Param('id') botId: string,
    @Query('open') open?: string,
  ) {
    // Get account for this bot
    const { data: account } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('bot_id', botId)
      .limit(1)
      .single();

    if (!account) return [];

    let query = this.supabase
      .from('positions')
      .select('*')
      .eq('account_id', account.id)
      .order('opened_at', { ascending: false });

    if (open === 'true') {
      query = query.eq('is_open', true);
    }

    const { data } = await query.limit(100);
    return data ?? [];
  }

  @Get('bots/:id/trades')
  async getBotTrades(
    @Param('id') botId: string,
    @Query('limit') limit?: string,
  ) {
    const { data: account } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('bot_id', botId)
      .limit(1)
      .single();

    if (!account) return [];

    const { data } = await this.supabase
      .from('trades')
      .select('*')
      .eq('account_id', account.id)
      .order('executed_at', { ascending: false })
      .limit(parseInt(limit ?? '50', 10));

    return data ?? [];
  }

  @Get('bots/:id/equity-history')
  async getBotEquityHistory(@Param('id') botId: string) {
    const { data: account } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('bot_id', botId)
      .limit(1)
      .single();

    if (!account) return [];

    const { data } = await this.supabase
      .from('equity_snapshots')
      .select('equity, cash, positions_value, snapshot_at')
      .eq('account_id', account.id)
      .order('snapshot_at', { ascending: true })
      .limit(1000);

    return data ?? [];
  }
}
