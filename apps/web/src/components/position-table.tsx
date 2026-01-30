import { formatUsd, formatQuantity } from '@/lib/format';

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

export function PositionTable({ positions }: { positions: PositionRow[] }) {
  if (positions.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 text-center text-sm text-gray-500">
        No open positions
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Side</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Entry</th>
            <th className="px-4 py-3 text-right">Current</th>
            <th className="px-4 py-3 text-right">uPnL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {positions.map((pos) => (
            <tr key={pos.id} className="hover:bg-gray-900/30">
              <td className="px-4 py-3 font-mono text-white">{pos.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    pos.side === 'LONG' ? 'text-green-400' : 'text-red-400'
                  }
                >
                  {pos.side}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {formatQuantity(Number(pos.quantity))}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {formatUsd(Number(pos.avg_entry_price))}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {pos.current_price ? formatUsd(Number(pos.current_price)) : '—'}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono ${
                  Number(pos.unrealized_pnl) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {formatUsd(Number(pos.unrealized_pnl))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
