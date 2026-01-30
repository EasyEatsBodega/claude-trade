import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { LeaderboardEntry } from '@claude-trade/shared';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  async getLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    // Try cached snapshot first
    const { data: snapshot } = await this.supabase
      .from('leaderboard_snapshots')
      .select('*')
      .eq('competition_id', competitionId)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshot) {
      // Get all entries for this snapshot time
      const { data: entries } = await this.supabase
        .from('leaderboard_snapshots')
        .select(`
          rank, equity, return_pct, account_state,
          bot_id,
          bots!inner(name, user_id, users!inner(display_name))
        `)
        .eq('competition_id', competitionId)
        .eq('snapshot_at', snapshot.snapshot_at)
        .order('rank', { ascending: true });

      if (entries) {
        return entries.map((e: Record<string, unknown>) => {
          const bot = e.bots as Record<string, unknown>;
          const user = bot?.users as Record<string, unknown>;
          return {
            botId: e.bot_id as string,
            botName: (bot?.name as string) ?? 'Unknown',
            ownerDisplayName: (user?.display_name as string) ?? 'Anonymous',
            rank: e.rank as number,
            equity: Number(e.equity),
            returnPct: Number(e.return_pct),
            accountState: e.account_state as LeaderboardEntry['accountState'],
          };
        });
      }
    }

    // Fall back to live computation
    return this.computeLeaderboard(competitionId);
  }

  async computeLeaderboard(competitionId: string): Promise<LeaderboardEntry[]> {
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select(`
        id, equity, status, cash, margin_used,
        bot_id,
        bots!inner(name, user_id, users!inner(display_name)),
        competitions!inner(starting_balance)
      `)
      .eq('competition_id', competitionId)
      .order('equity', { ascending: false });

    if (!accounts) return [];

    return accounts.map((a: Record<string, unknown>, index: number) => {
      const bot = a.bots as Record<string, unknown>;
      const user = bot?.users as Record<string, unknown>;
      const comp = a.competitions as Record<string, unknown>;
      const startingBalance = Number(comp?.starting_balance ?? 100000);
      const equity = Number(a.equity);

      return {
        botId: a.bot_id as string,
        botName: (bot?.name as string) ?? 'Unknown',
        ownerDisplayName: (user?.display_name as string) ?? 'Anonymous',
        rank: index + 1,
        equity,
        returnPct: ((equity - startingBalance) / startingBalance) * 100,
        accountState: a.status as LeaderboardEntry['accountState'],
      };
    });
  }

  async createSnapshot(competitionId: string): Promise<void> {
    const entries = await this.computeLeaderboard(competitionId);
    if (entries.length === 0) return;

    const now = new Date().toISOString();

    // Need account_id for snapshot — look it up
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id, bot_id')
      .eq('competition_id', competitionId);

    const botToAccount = new Map(
      (accounts ?? []).map((a) => [a.bot_id, a.id]),
    );

    const rows = entries.map((e) => ({
      competition_id: competitionId,
      bot_id: e.botId,
      account_id: botToAccount.get(e.botId) ?? '',
      rank: e.rank,
      equity: e.equity,
      return_pct: e.returnPct,
      account_state: e.accountState,
      snapshot_at: now,
    }));

    await this.supabase.from('leaderboard_snapshots').insert(rows);
    this.logger.log(`Leaderboard snapshot created for competition ${competitionId}: ${entries.length} entries`);
  }
}
