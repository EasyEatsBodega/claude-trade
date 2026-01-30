'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { StatusBadge } from '@/components/status-badge';
import { formatUsd, formatPct } from '@/lib/format';
import type { AccountState } from '@claude-trade/shared';

interface BotDetail {
  id: string;
  name: string;
  model: string;
  is_active: boolean;
  accounts: {
    status: AccountState;
    equity: number;
    cash: number;
  }[];
  bot_config: {
    strategy_prompt: string;
  }[];
}

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku-35-20241022', label: 'Claude 3.5 Haiku' },
];

export default function ManageBotPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [strategy, setStrategy] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  const loadBot = useCallback(async () => {
    const t = await getToken();

    if (!t) {
      router.push('/sign-in');
      return;
    }

    setToken(t);

    const res = await fetch(`${apiBase}/bots/${id}`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (res.ok) {
      const botData = await res.json() as BotDetail;
      setBot(botData);
      setStrategy(botData.bot_config?.[0]?.strategy_prompt ?? '');
    }
  }, [id, router, getToken, apiBase]);

  useEffect(() => {
    loadBot();
  }, [loadBot]);

  async function authFetch(path: string, options?: RequestInit) {
    return fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
  }

  async function saveStrategy() {
    setSaving(true);
    setMessage('');
    try {
      const res = await authFetch(`/bots/${id}/prompt`, {
        method: 'PATCH',
        body: JSON.stringify({ strategyPrompt: strategy }),
      });
      if (res.ok) setMessage('Strategy saved');
      else throw new Error('Failed to save');
    } catch (err) {
      setMessage((err as Error).message);
    }
    setSaving(false);
  }

  async function saveApiKey() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await authFetch(`/bots/${id}/secret`, {
        method: 'PATCH',
        body: JSON.stringify({ anthropicApiKey: apiKey }),
      });
      if (res.ok) {
        setMessage('API key updated');
        setApiKey('');
      } else throw new Error('Failed to save');
    } catch (err) {
      setMessage((err as Error).message);
    }
    setSaving(false);
  }

  async function toggleActive() {
    setSaving(true);
    const endpoint = bot?.is_active ? 'deactivate' : 'activate';
    try {
      await authFetch(`/bots/${id}/${endpoint}`, { method: 'PATCH' });
      await loadBot();
    } catch {
      setMessage('Failed to toggle bot');
    }
    setSaving(false);
  }

  if (!bot) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-gray-400">
        Loading...
      </div>
    );
  }

  const account = bot.accounts?.[0];
  const equity = account ? Number(account.equity) : 100000;
  const returnPct = ((equity - 100000) / 100000) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{bot.name}</h1>
            {account && <StatusBadge status={account.status} />}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {MODELS.find((m) => m.value === bot.model)?.label ?? bot.model}
          </p>
        </div>
        <Link
          href={`/bots/${bot.id}`}
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          View Public Page
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="text-xs text-gray-500 uppercase">Equity</p>
          <p className="font-mono font-semibold text-white">
            {formatUsd(equity)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="text-xs text-gray-500 uppercase">Return</p>
          <p
            className={`font-mono font-semibold ${returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {formatPct(returnPct)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="text-xs text-gray-500 uppercase">Status</p>
          <p className="font-semibold text-white">
            {bot.is_active ? 'Running' : 'Paused'}
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-sm text-gray-300">
          {message}
        </div>
      )}

      {/* Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Strategy Prompt
        </label>
        <textarea
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          rows={10}
          className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
        />
        <button
          onClick={saveStrategy}
          disabled={saving}
          className="mt-2 rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50"
        >
          Save Strategy
        </button>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Update Anthropic API Key
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white font-mono text-sm placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={saveApiKey}
            disabled={saving || !apiKey.trim()}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
          >
            Update Key
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Your key is encrypted and never shown again.
        </p>
      </div>

      {/* Toggle Active */}
      <div className="border-t border-gray-800 pt-6">
        <button
          onClick={toggleActive}
          disabled={saving}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            bot.is_active
              ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
          }`}
        >
          {bot.is_active ? 'Pause Bot' : 'Activate Bot'}
        </button>
      </div>
    </div>
  );
}
