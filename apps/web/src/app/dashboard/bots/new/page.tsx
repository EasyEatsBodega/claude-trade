'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku-35-20241022', label: 'Claude 3.5 Haiku' },
];

export default function CreateBotPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [name, setName] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [strategy, setStrategy] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getToken();

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

      // Create bot
      const res = await fetch(`${apiBase}/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, model }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to create bot');
      }

      const bot = await res.json();

      // Set strategy prompt
      if (strategy.trim()) {
        await fetch(`${apiBase}/bots/${bot.id}/prompt`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ strategyPrompt: strategy }),
        });
      }

      // Set API key
      if (apiKey.trim()) {
        await fetch(`${apiBase}/bots/${bot.id}/secret`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ anthropicApiKey: apiKey }),
        });
      }

      router.push(`/dashboard/bots/${bot.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Create Bot</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Bot Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="My Trading Bot"
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Strategy Prompt
          </label>
          <textarea
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            rows={8}
            placeholder="Describe your trading strategy..."
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            This prompt is injected alongside the rules pack every cycle.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your key is encrypted at rest and never displayed again.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Bot'}
        </button>
      </form>
    </div>
  );
}
