import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/status-badge';
import { formatUsd, formatPct } from '@/lib/format';
import { apiFetch } from '@/lib/api';
import type { AccountState } from '@claude-trade/shared';

interface BotRow {
  id: string;
  name: string;
  model: string;
  is_active: boolean;
  created_at: string;
  accounts: {
    status: AccountState;
    equity: number;
  }[];
}

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  let myBots: BotRow[] = [];
  try {
    myBots = await apiFetch<BotRow[]>(`/bots?userId=${user.id}`);
  } catch {
    // API may not have bots endpoint with query yet, fallback to empty
    myBots = [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Bots</h1>
        <Link
          href="/dashboard/bots/new"
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 transition-colors"
        >
          Create Bot
        </Link>
      </div>

      {myBots.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-400 mb-4">You haven&apos;t created any bots yet</p>
          <Link
            href="/dashboard/bots/new"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
          >
            Create Your First Bot
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myBots.map((bot) => {
            const account = bot.accounts?.[0];
            const equity = account ? Number(account.equity) : 100000;
            const returnPct = ((equity - 100000) / 100000) * 100;

            return (
              <Link
                key={bot.id}
                href={`/dashboard/bots/${bot.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{bot.name}</span>
                      {account && <StatusBadge status={account.status} />}
                      {!bot.is_active && (
                        <span className="text-xs text-gray-600">paused</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{bot.model}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-white">{formatUsd(equity)}</p>
                  <p
                    className={`text-xs font-mono ${
                      returnPct >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {formatPct(returnPct)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
