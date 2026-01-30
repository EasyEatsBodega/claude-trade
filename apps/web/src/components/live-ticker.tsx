'use client';

import { useEffect, useState } from 'react';

interface TickerAsset {
  id: string;
  symbol: string;
  color: string;
}

const ASSETS: TickerAsset[] = [
  { id: 'bitcoin', symbol: 'BTC', color: '#F7931A' },
  { id: 'ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'solana', symbol: 'SOL', color: '#9945FF' },
  { id: 'dogecoin', symbol: 'DOGE', color: '#C3A634' },
  { id: 'pepe', symbol: 'PEPE', color: '#4E9A06' },
  { id: 'dogwifhat', symbol: 'WIF', color: '#E8529A' },
  { id: 'bonk', symbol: 'BONK', color: '#F5A623' },
  { id: 'render-token', symbol: 'RENDER', color: '#00E0FF' },
];

interface PriceData {
  usd: number;
  usd_24h_change: number;
}

type PriceResponse = Record<string, PriceData>;

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.001) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

export function LiveTicker() {
  const [prices, setPrices] = useState<PriceResponse | null>(null);

  useEffect(() => {
    const ids = ASSETS.map((a) => a.id).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

    async function fetchPrices() {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json() as PriceResponse;
          setPrices(data);
        }
      } catch {
        // silently fail, keep showing last known prices or fallback
      }
    }

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative border-b border-gray-800/50 bg-gray-950/80 overflow-hidden">
      <div className="animate-ticker flex whitespace-nowrap py-3">
        {/* Render twice for seamless loop */}
        {[...ASSETS, ...ASSETS].map((asset, i) => {
          const data = prices?.[asset.id];
          const price = data ? formatPrice(data.usd) : '...';
          const change = data ? formatChange(data.usd_24h_change) : '';
          const positive = data ? data.usd_24h_change >= 0 : true;

          return (
            <div key={`${asset.symbol}-${i}`} className="flex items-center gap-3 px-5 border-r border-gray-800/50 shrink-0">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: asset.color }} />
              <span className="text-xs font-semibold text-white font-mono">{asset.symbol}</span>
              <span className="text-xs text-gray-400 font-mono">{price}</span>
              {change && (
                <span className={`text-xs font-mono font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {change}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
