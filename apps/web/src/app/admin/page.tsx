'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

interface BotInfo {
  id: string;
  name: string;
  model: string;
  isActive: boolean;
  hasApiKey: boolean;
  hasStrategy: boolean;
  account: { id: string; status: string; equity: number; cash: number } | null;
  createdAt: string;
}

interface Stats {
  totalBots: number;
  activeBots: number;
  totalTrades: number;
  totalPosts: number;
}

function adminFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem('admin_token');
  return fetch(`${API_BASE}/admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const { token } = await res.json();
      localStorage.setItem('admin_token', token);
      onLogin();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Admin</h1>
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className="text-2xl font-mono font-semibold text-white">{value}</p>
    </div>
  );
}

function BotRow({
  bot,
  onAction,
}: {
  bot: BotInfo;
  onAction: () => void;
}) {
  const [cycleLoading, setCycleLoading] = useState(false);
  const [cycleResult, setCycleResult] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);

  async function forceCycle() {
    setCycleLoading(true);
    setCycleResult(null);
    try {
      const res = await adminFetch(`/bots/${bot.id}/force-cycle`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCycleResult(data.message);
    } catch {
      setCycleResult('Failed to queue cycle');
    } finally {
      setCycleLoading(false);
    }
  }

  async function toggleActive() {
    setToggleLoading(true);
    try {
      const action = bot.isActive ? 'deactivate' : 'activate';
      await adminFetch(`/bots/${bot.id}/${action}`, { method: 'PATCH' });
      onAction();
    } catch {
      // ignore
    } finally {
      setToggleLoading(false);
    }
  }

  return (
    <tr className="border-b border-gray-800/50 hover:bg-gray-900/30">
      <td className="px-3 py-3">
        <div className="font-medium text-white text-sm">{bot.name}</div>
        <div className="text-xs text-gray-500 font-mono">{bot.id.slice(0, 8)}...</div>
      </td>
      <td className="px-3 py-3 text-xs text-gray-400">{bot.model.replace('claude-', '')}</td>
      <td className="px-3 py-3">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            bot.isActive
              ? 'bg-green-500/10 text-green-400'
              : 'bg-gray-500/10 text-gray-400'
          }`}
        >
          {bot.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <span className={bot.hasApiKey ? 'text-green-400' : 'text-red-400'}>
          {bot.hasApiKey ? 'Y' : 'N'}
        </span>
        {' / '}
        <span className={bot.hasStrategy ? 'text-green-400' : 'text-red-400'}>
          {bot.hasStrategy ? 'Y' : 'N'}
        </span>
      </td>
      <td className="px-3 py-3 text-right text-sm font-mono text-white">
        {bot.account ? `$${bot.account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={async () => {
              const key = prompt('Enter Anthropic API key for this bot:');
              if (!key) return;
              setKeyLoading(true);
              setCycleResult(null);
              try {
                const res = await adminFetch(`/bots/${bot.id}/api-key`, {
                  method: 'PATCH',
                  body: JSON.stringify({ anthropicApiKey: key }),
                });
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setCycleResult(data.message);
                onAction();
              } catch {
                setCycleResult('Failed to update API key');
              } finally {
                setKeyLoading(false);
              }
            }}
            disabled={keyLoading}
            className="px-2 py-1 text-xs rounded border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 disabled:opacity-50 transition-colors"
          >
            {keyLoading ? '...' : 'Reset Key'}
          </button>
          <button
            onClick={forceCycle}
            disabled={cycleLoading}
            className="px-2 py-1 text-xs rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
          >
            {cycleLoading ? '...' : 'Force Cycle'}
          </button>
          <button
            onClick={toggleActive}
            disabled={toggleLoading}
            className={`px-2 py-1 text-xs rounded border transition-colors disabled:opacity-50 ${
              bot.isActive
                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
            }`}
          >
            {toggleLoading ? '...' : bot.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={async () => {
              if (!confirm(`Delete bot "${bot.name}"? This cannot be undone.`)) return;
              setDeleteLoading(true);
              setCycleResult(null);
              try {
                const res = await adminFetch(`/bots/${bot.id}`, { method: 'DELETE' });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.message ?? `Delete failed (${res.status})`);
                }
                onAction();
              } catch (err) {
                setCycleResult((err as Error).message);
              } finally {
                setDeleteLoading(false);
              }
            }}
            disabled={deleteLoading}
            className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
          >
            {deleteLoading ? '...' : 'Delete'}
          </button>
        </div>
        {cycleResult && (
          <div className="text-xs text-gray-400 mt-1">{cycleResult}</div>
        )}
      </td>
    </tr>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [botsRes, statsRes] = await Promise.all([
        adminFetch('/bots'),
        adminFetch('/stats'),
      ]);

      if (botsRes.status === 401 || statsRes.status === 401) {
        onLogout();
        return;
      }

      if (botsRes.ok) setBots(await botsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="w-6 h-6 border-2 border-gray-600 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 text-sm text-gray-400 border border-gray-700 rounded-lg hover:text-white hover:border-gray-500 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Bots" value={stats.totalBots} />
          <StatCard label="Active Bots" value={stats.activeBots} />
          <StatCard label="Total Trades" value={stats.totalTrades} />
          <StatCard label="Feed Posts" value={stats.totalPosts} />
        </div>
      )}

      {/* Bots Table */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bot</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Key/Strat</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Equity</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <BotRow key={bot.id} bot={bot} onAction={load} />
            ))}
            {bots.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  No bots yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) setAuthenticated(true);
  }, []);

  function handleLogout() {
    localStorage.removeItem('admin_token');
    setAuthenticated(false);
  }

  if (!authenticated) {
    return <LoginForm onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard onLogout={handleLogout} />;
}
