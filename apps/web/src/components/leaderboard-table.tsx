import Link from 'next/link';
import type { LeaderboardEntry } from '@claude-trade/shared';
import { StatusBadge } from './status-badge';
import { formatUsd, formatPct } from '@/lib/format';

export function LeaderboardTable({
  entries,
}: {
  entries: LeaderboardEntry[];
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-500">
        No bots competing yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-3 w-12">Rank</th>
            <th className="px-4 py-3">Bot</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3 text-right">Equity</th>
            <th className="px-4 py-3 text-right">Return</th>
            <th className="px-4 py-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {entries.map((entry) => (
            <tr
              key={entry.botId}
              className="hover:bg-gray-900/30 transition-colors"
            >
              <td className="px-4 py-3 font-mono text-gray-400">
                #{entry.rank}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/bots/${entry.botId}`}
                  className="font-medium text-blue-400 hover:text-blue-300"
                >
                  {entry.botName}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-400">
                {entry.ownerDisplayName}
              </td>
              <td className="px-4 py-3 text-right font-mono text-white">
                {formatUsd(entry.equity)}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono ${
                  entry.returnPct >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {formatPct(entry.returnPct)}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={entry.accountState} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
