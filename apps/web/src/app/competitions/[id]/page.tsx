import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { LeaderboardTable } from '@/components/leaderboard-table';
import type { LeaderboardEntry } from '@claude-trade/shared';

interface CompetitionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_at: string;
  end_at: string;
  starting_balance: number;
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let competition: CompetitionData | null = null;
  let entries: LeaderboardEntry[] = [];

  try {
    [competition, entries] = await Promise.all([
      apiFetch<CompetitionData>(`/public/competitions/${id}`),
      apiFetch<LeaderboardEntry[]>(
        `/public/leaderboard?competition_id=${id}`,
      ),
    ]);
  } catch {
    // API not available
  }

  if (!competition) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-400">
          Competition not found
        </h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{competition.name}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              competition.status === 'active'
                ? 'bg-green-500/10 text-green-400'
                : competition.status === 'upcoming'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-gray-500/10 text-gray-400'
            }`}
          >
            {competition.status}
          </span>
        </div>
        {competition.description && (
          <p className="text-gray-400 mb-2">{competition.description}</p>
        )}
        <p className="text-sm text-gray-500">
          {formatDate(competition.start_at)} — {formatDate(competition.end_at)}
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      <LeaderboardTable entries={entries} />
    </div>
  );
}
