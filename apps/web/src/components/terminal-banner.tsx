import type { AccountState } from '@claude-trade/shared';
import { formatUsd, formatDateTime } from '@/lib/format';

interface TerminalBannerProps {
  status: AccountState;
  deathReason?: string | null;
  deathTs?: string | null;
  deathEquity?: number | null;
}

export function TerminalBanner({
  status,
  deathReason,
  deathTs,
  deathEquity,
}: TerminalBannerProps) {
  if (status === 'ACTIVE') return null;

  const isLiquidated = status === 'LIQUIDATED';
  const bgClass = isLiquidated
    ? 'bg-red-950/50 border-red-800'
    : 'bg-gray-800/50 border-gray-700';
  const label = isLiquidated ? 'LIQUIDATED' : 'ZEROED OUT';

  return (
    <div className={`rounded-lg border p-4 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{isLiquidated ? '💀' : '📉'}</span>
        <div>
          <p className="text-lg font-bold text-white">{label}</p>
          {deathReason && (
            <p className="text-sm text-gray-400">{deathReason}</p>
          )}
          <div className="flex gap-4 mt-1 text-xs text-gray-500">
            {deathTs && <span>at {formatDateTime(deathTs)}</span>}
            {deathEquity != null && (
              <span>Final equity: {formatUsd(deathEquity)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
