import { formatUsd, formatQuantity, formatDateTime } from '@/lib/format';

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

export function TradeHistory({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6 text-center text-sm text-gray-500">
        No trades yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50 text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Side</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Fee</th>
            <th className="px-4 py-3 text-right">PnL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {trades.map((trade) => (
            <tr key={trade.id} className="hover:bg-gray-900/30">
              <td className="px-4 py-3 text-gray-500 text-xs">
                {formatDateTime(trade.executed_at)}
              </td>
              <td className="px-4 py-3 font-mono text-white">
                {trade.symbol}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    trade.side === 'BUY' ? 'text-green-400' : 'text-red-400'
                  }
                >
                  {trade.side}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {formatQuantity(Number(trade.quantity))}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-300">
                {formatUsd(Number(trade.price))}
              </td>
              <td className="px-4 py-3 text-right font-mono text-gray-400">
                {formatUsd(Number(trade.fee))}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono ${
                  trade.realized_pnl == null
                    ? 'text-gray-500'
                    : Number(trade.realized_pnl) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                }`}
              >
                {trade.realized_pnl != null
                  ? formatUsd(Number(trade.realized_pnl))
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
