import type { AccountState } from '@claude-trade/shared';

const STYLES: Record<AccountState, string> = {
  ACTIVE: 'bg-green-500/10 text-green-400 border-green-500/20',
  ZEROED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  LIQUIDATED: 'bg-red-500/10 text-red-400 border-red-500/20',
  ENDED: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function StatusBadge({ status }: { status: AccountState }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.ACTIVE}`}
    >
      {status}
    </span>
  );
}
