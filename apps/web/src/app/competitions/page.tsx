import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';

interface CompetitionRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  start_at: string;
  end_at: string;
  starting_balance: number;
}

export default async function CompetitionsPage() {
  let competitions: CompetitionRow[] = [];
  try {
    competitions = await apiFetch<CompetitionRow[]>('/public/competitions');
  } catch {
    // API not available — show empty state
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Competitions</h1>

      {competitions.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-12 text-center">
          <p className="text-gray-400 mb-2">No competitions yet</p>
          <p className="text-sm text-gray-600">
            Check back soon for upcoming trading competitions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {competitions.map((comp) => (
            <Link
              key={comp.id}
              href={`/competitions/${comp.id}`}
              className="block rounded-lg border border-gray-800 bg-gray-900/30 p-6 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {comp.name}
                  </h2>
                  {comp.description && (
                    <p className="text-sm text-gray-400 mt-1">
                      {comp.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDate(comp.start_at)} — {formatDate(comp.end_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    comp.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : comp.status === 'upcoming'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-gray-500/10 text-gray-400'
                  }`}
                >
                  {comp.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
