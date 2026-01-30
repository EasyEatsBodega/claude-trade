import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { MarginCalculator } from '../trading/margin-calculator';
import { AccountLifecycle } from '../trading/account-lifecycle';
import { InternalGuard } from './internal.guard';

@Controller('internal')
@UseGuards(InternalGuard)
export class InternalLeaderboardController {
  private supabase: SupabaseClient;

  constructor(
    private config: ConfigService,
    private leaderboardService: LeaderboardService,
    private marginCalc: MarginCalculator,
    private accountLifecycle: AccountLifecycle,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  @Get('account/:id')
  async getAccount(@Param('id') accountId: string) {
    const { data: account } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (!account) return { error: 'Account not found' };

    const { data: positions } = await this.supabase
      .from('positions')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_open', true);

    return { ...account, positions: positions ?? [] };
  }

  @Get('competitions/active')
  async getActiveCompetitions() {
    const now = new Date().toISOString();
    const { data } = await this.supabase
      .from('competitions')
      .select('id, name, slug')
      .lte('start_date', now)
      .gte('end_date', now);

    return data ?? [];
  }

  @Post('leaderboard/snapshot/:competitionId')
  async createLeaderboardSnapshot(@Param('competitionId') competitionId: string) {
    await this.leaderboardService.createSnapshot(competitionId);
    return { success: true };
  }

  @Post('equity-snapshots')
  async createEquitySnapshots() {
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id, cash, equity, margin_used')
      .eq('status', 'ACTIVE');

    if (!accounts || accounts.length === 0) return { count: 0 };

    const now = new Date().toISOString();
    const rows = [];

    for (const account of accounts) {
      const { data: positions } = await this.supabase
        .from('positions')
        .select('*')
        .eq('account_id', account.id)
        .eq('is_open', true);

      const openPositions = (positions ?? []).map((p) => ({
        symbol: p.symbol,
        quantity: Number(p.quantity),
        avgEntryPrice: Number(p.avg_entry_price),
        currentPrice: Number(p.current_price ?? p.avg_entry_price),
        side: p.side as 'LONG' | 'SHORT',
      }));

      const equity = this.marginCalc.computeEquity(
        Number(account.cash),
        openPositions,
      );

      let positionsValue = 0;
      for (const pos of openPositions) {
        positionsValue += Math.abs(pos.quantity) * pos.currentPrice;
      }

      rows.push({
        account_id: account.id,
        equity,
        cash: Number(account.cash),
        positions_value: positionsValue,
        margin_used: Number(account.margin_used),
        snapshot_at: now,
      });

      // Update equity on account
      await this.supabase
        .from('accounts')
        .update({ equity })
        .eq('id', account.id);
    }

    await this.supabase.from('equity_snapshots').insert(rows);
    return { count: rows.length };
  }

  @Post('liquidation-sweep')
  async liquidationSweep() {
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('status', 'ACTIVE');

    if (!accounts) return { checked: 0, liquidated: 0 };

    let liquidated = 0;
    for (const account of accounts) {
      const { transitioned } =
        await this.accountLifecycle.checkAndTransition(account.id);
      if (transitioned) liquidated++;
    }

    return { checked: accounts.length, liquidated };
  }
}
