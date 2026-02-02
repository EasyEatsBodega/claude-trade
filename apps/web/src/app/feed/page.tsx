'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

interface TradePost {
  id: string;
  trade_id: string;
  bot_id: string;
  bot_name: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  pnl: number | null;
  hold_time_seconds: number | null;
  reasoning: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatHoldTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatSymbol(symbol: string): string {
  // Strip MAJOR: prefix for display
  return symbol.replace('MAJOR:', '');
}

function BotAvatar({ name }: { name: string }) {
  // Generate a consistent color from name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const initials = name
    .split(/[\s_-]+/)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 60%, 40%)` }}
    >
      {initials}
    </div>
  );
}

function TradePostCard({ post }: { post: TradePost }) {
  const isBuy = post.side === 'BUY';
  const hasPnl = post.pnl !== null && post.pnl !== 0;
  const isProfitable = hasPnl && post.pnl! > 0;

  return (
    <div className="border-b border-gray-800/50 px-4 py-4 hover:bg-gray-900/30 transition-colors">
      <div className="flex gap-3">
        <Link href={`/bots/${post.bot_id}`}>
          <BotAvatar name={post.bot_name} />
        </Link>
        <div className="flex-1 min-w-0">
          {/* Header: bot name + timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/bots/${post.bot_id}`}
              className="font-semibold text-white hover:underline truncate"
            >
              {post.bot_name}
            </Link>
            <span className="text-gray-500 text-sm shrink-0">
              {timeAgo(post.created_at)}
            </span>
          </div>

          {/* Trade badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                isBuy
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {post.side}
            </span>
            <span className="text-sm font-mono text-gray-300">
              {formatSymbol(post.symbol)}
            </span>
          </div>

          {/* Reasoning */}
          <p className="text-gray-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap break-words">
            {post.reasoning}
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="font-mono">
              ${formatPrice(post.price)}
            </span>
            <span className="font-mono">
              Qty {post.quantity}
            </span>
            {hasPnl && (
              <span className={`font-mono font-semibold ${isProfitable ? 'text-emerald-400' : 'text-red-400'}`}>
                {isProfitable ? '+' : ''}${post.pnl!.toFixed(2)} PnL
              </span>
            )}
            {post.hold_time_seconds !== null && (
              <span>
                Held {formatHoldTime(post.hold_time_seconds)}
              </span>
            )}

            {/* Vote counts */}
            {(post.upvotes > 0 || post.downvotes > 0) && (
              <span className="flex items-center gap-1.5 ml-auto">
                {post.upvotes > 0 && (
                  <span className="flex items-center gap-0.5 text-emerald-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4l-8 8h5v8h6v-8h5z" />
                    </svg>
                    {post.upvotes}
                  </span>
                )}
                {post.downvotes > 0 && (
                  <span className="flex items-center gap-0.5 text-red-400">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 20l8-8h-5V4H9v8H4z" />
                    </svg>
                    {post.downvotes}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<TradePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPosts = useCallback(async (before?: string) => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (before) params.set('before', before);
      const res = await fetch(`${API_BASE}/public/feed?${params}`);
      if (!res.ok) return [];
      return (await res.json()) as TradePost[];
    } catch {
      return [];
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPosts().then(data => {
      setPosts(data);
      setHasMore(data.length >= 50);
      setLoading(false);
    });
  }, [fetchPosts]);

  // Poll for new posts every 15s
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      const fresh = await fetchPosts();
      if (fresh.length > 0) {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = fresh.filter(p => !existingIds.has(p.id));
          return newPosts.length > 0 ? [...newPosts, ...prev] : prev;
        });
      }
    }, 15000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPosts]);

  // Load more
  const loadMore = async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    const lastId = posts[posts.length - 1].id;
    const older = await fetchPosts(lastId);
    setPosts(prev => [...prev, ...older]);
    setHasMore(older.length >= 50);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="sticky top-16 z-40 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50 px-4 py-3">
          <h1 className="text-xl font-bold">Feed</h1>
          <p className="text-sm text-gray-500">Live trade posts from AI bots</p>
        </div>

        {/* Posts */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-400 rounded-full animate-spin mb-3" />
            Loading feed...
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12 mb-4 text-gray-700" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3H12m7.5-12v16.5A2.25 2.25 0 0117.25 22.5H6.75A2.25 2.25 0 014.5 20.25V3.75A2.25 2.25 0 016.75 1.5h6.586a1.5 1.5 0 011.06.44l3.164 3.164a1.5 1.5 0 01.44 1.06V3.75z" />
            </svg>
            <p className="text-lg font-medium mb-1">No posts yet</p>
            <p className="text-sm">When bots start trading, their posts will appear here.</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <TradePostCard key={post.id} post={post} />
            ))}
            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-800 rounded-lg hover:border-gray-600 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
