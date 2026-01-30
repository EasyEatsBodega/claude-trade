import { apiFetch } from '@/lib/api';
import { formatUsd, formatPct } from '@/lib/format';
import { StatusBadge } from '@/components/status-badge';
import { TerminalBanner } from '@/components/terminal-banner';
import { EquityChart } from '@/components/equity-chart';
import { PositionTable } from '@/components/position-table';
import { TradeHistory } from '@/components/trade-history';
import type { AccountState } from '@claude-trade/shared';

interface BotData {
  id: string;
  name: string;
  model: string;
  created_at: string;
  users: { display_name: string; avatar_url: string | null };
  accounts: {
    id: string;
    status: AccountState;
    equity: number;
    cash: number;
    margin_used: number;
    death_reason: string | null;
    death_ts: string | null;
    death_equity: number | null;
  }[];
  bot_config: { strategy_prompt: string }[];
}

interface PositionRow {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number | null;
  unrealized_pnl: number;
  is_open: boolean;
}

interface TradeRow {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  fee: number;
  realized_pnl: number | null;
  executed_at: string;
}

interface EquityPoint {
  equity: number;
  snapshot_at: string;
}

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let bot: BotData | null = null;
  let positions: PositionRow[] = [];
  let trades: TradeRow[] = [];
  let equityHistory: EquityPoint[] = [];

  try {
    [bot, positions, trades, equityHistory] = await Promise.all([
      apiFetch<BotData>(`/public/bots/${id}`),
      apiFetch<PositionRow[]>(`/public/bots/${id}/positions?open=true`),
      apiFetch<TradeRow[]>(`/public/bots/${id}/trades?limit=50`),
      apiFetch<EquityPoint[]>(`/public/bots/${id}/equity-history`),
    ]);
  } catch {
    // API not available
  }

  if (!bot) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-400">Bot not found</h1>
      </div>
    );
  }

  const account = bot.accounts?.[0];
  const equity = account ? Number(account.equity) : 0;
  const returnPct = ((equity - 10000) / 10000) * 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold">{bot.name}</h1>
          {account && <StatusBadge status={account.status} />}
        </div>
        <p className="text-sm text-gray-400">
          by {bot.users?.display_name ?? 'Anonymous'} &middot; {bot.model}
        </p>
      </div>

      {/* Terminal Banner */}
      {account && account.status !== 'ACTIVE' && (
        <TerminalBanner
          status={account.status}
          deathReason={account.death_reason}
          deathTs={account.death_ts}
          deathEquity={account.death_equity}
        />
      )}

      {/* Stats Cards */}
      {account && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Equity" value={formatUsd(equity)} />
          <StatCard
            label="Return"
            value={formatPct(returnPct)}
            color={returnPct >= 0 ? 'green' : 'red'}
          />
          <StatCard label="Cash" value={formatUsd(Number(account.cash))} />
          <StatCard
            label="Margin Used"
            value={formatUsd(Number(account.margin_used))}
          />
        </div>
      )}

      {/* Equity Chart */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Equity History</h2>
        <EquityChart data={equityHistory} />
      </div>

      {/* Open Positions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Open Positions ({positions.length})
        </h2>
        <PositionTable positions={positions} />
      </div>

      {/* Recent Trades */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Trades</h2>
        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red';
}) {
  const valueColor =
    color === 'green'
      ? 'text-green-400'
      : color === 'red'
        ? 'text-red-400'
        : 'text-white';

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-lg font-mono font-semibold ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}
