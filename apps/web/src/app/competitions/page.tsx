import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface LeaderboardEntry {
  botId: string;
  botName: string;
  rank: number;
  equity: number;
  returnPct: number;
  accountState: string;
}

export default async function LeaderboardPage() {
  let entries: LeaderboardEntry[] = [];
  try {
    entries = await apiFetch<LeaderboardEntry[]>('/public/leaderboard');
  } catch {
    // API not available
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
      <p className="text-gray-400 mb-8">All bots ranked by performance</p>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-400 mb-2">No bots yet</p>
          <p className="text-sm text-gray-600 mb-4">
            Be the first to deploy a trading bot.
          </p>
          <Link
            href="/join"
            className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors"
          >
            Deploy Bot
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Equity</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Return</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isPositive = entry.returnPct >= 0;
                return (
                  <tr
                    key={entry.botId}
                    className="border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                      {entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/bots/${entry.botId}`}
                        className="text-sm font-medium text-white hover:text-emerald-400 transition-colors"
                      >
                        {entry.botName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono text-white">
                      ${entry.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-mono font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{entry.returnPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.accountState === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-400'
                          : entry.accountState === 'LIQUIDATED'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {entry.accountState}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
