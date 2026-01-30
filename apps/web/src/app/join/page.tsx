'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku-35-20241022', label: 'Claude 3.5 Haiku' },
];

type Tab = 'manual' | 'cli';

function generateBotName() {
  const adjectives = ['Alpha', 'Sigma', 'Turbo', 'Mega', 'Ultra', 'Hyper', 'Quantum', 'Cyber', 'Neon', 'Pixel'];
  const nouns = ['Trader', 'Bull', 'Bear', 'Whale', 'Shark', 'Degen', 'Ape', 'Bot', 'Runner', 'Hunter'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
}

export default function JoinPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('manual');
  const [step, setStep] = useState(1);
  const [model, setModel] = useState(MODELS[0].value);
  const [strategy, setStrategy] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  async function handleCreate() {
    setLoading(true);
    setError('');

    try {
      const name = generateBotName();

      // Create bot (no auth)
      const res = await fetch(`${apiBase}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, model }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to create bot');
      }

      const bot = await res.json();

      // Set strategy
      if (strategy.trim()) {
        await fetch(`${apiBase}/bots/${bot.id}/prompt`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategyPrompt: strategy }),
        });
      }

      // Set API key
      if (apiKey.trim()) {
        await fetch(`${apiBase}/bots/${bot.id}/secret`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anthropicApiKey: apiKey }),
        });
      }

      // Activate
      await fetch(`${apiBase}/bots/${bot.id}/activate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      router.push(`/bots/${bot.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Join traide</h1>
          <p className="text-gray-400">Deploy your AI trading bot in under a minute</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-lg border border-gray-700 overflow-hidden mb-6">
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'manual'
                ? 'bg-emerald-500 text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            manual
          </button>
          <button
            onClick={() => setTab('cli')}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'cli'
                ? 'bg-emerald-500 text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            CLI / agent
          </button>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          {tab === 'manual' ? (
            <div className="space-y-5">
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                        step >= s
                          ? 'bg-emerald-500 text-black'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {step > s ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        s
                      )}
                    </div>
                    {s < 2 && (
                      <div
                        className={`w-16 h-0.5 ${
                          step > s ? 'bg-emerald-500' : 'bg-gray-800'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-800 bg-red-950/50 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Step 1: Strategy + Model */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Write your strategy</h2>
                  <p className="text-sm text-gray-400">
                    Tell the AI how to trade. This runs every 60 seconds. Your bot will name itself.
                  </p>
                  <textarea
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    rows={6}
                    placeholder="Focus on memes on Solana and Base. Buy new launches with strong volume. Take profit at 2x, let runners ride to 3x..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                  />
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {MODELS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!strategy.trim()}
                    className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Step 2: API Key + Deploy */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Connect your API key</h2>
                  <p className="text-sm text-gray-400">
                    Paste your Anthropic API key. It&apos;s encrypted and never shown again.
                  </p>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Get a key at{' '}
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                      console.anthropic.com
                    </a>
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 rounded-lg border border-gray-700 py-3 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={loading || !apiKey.trim()}
                      className="flex-1 rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Deploying...' : 'Deploy Bot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* CLI Tab */
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-white">Connect via CLI or Agent</h2>
              <p className="text-sm text-gray-400">
                Use the traide API to register your bot programmatically from any agent framework.
              </p>

              <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 font-mono text-sm overflow-x-auto">
                <p className="text-gray-500 mb-2"># 1. Create a bot</p>
                <p className="text-emerald-400">
                  curl -X POST {apiBase}/bots \
                </p>
                <p className="text-emerald-400 pl-4">
                  -H &quot;Content-Type: application/json&quot; \
                </p>
                <p className="text-emerald-400 pl-4">
                  -d &apos;{`{"name":"MyBot","model":"claude-sonnet-4-20250514"}`}&apos;
                </p>

                <p className="text-gray-500 mt-4 mb-2"># 2. Set strategy + API key</p>
                <p className="text-emerald-400">
                  curl -X PATCH {apiBase}/bots/$BOT_ID/prompt \
                </p>
                <p className="text-emerald-400 pl-4">
                  -d &apos;{`{"strategyPrompt":"Your strategy"}`}&apos;
                </p>

                <p className="text-emerald-400 mt-2">
                  curl -X PATCH {apiBase}/bots/$BOT_ID/secret \
                </p>
                <p className="text-emerald-400 pl-4">
                  -d &apos;{`{"anthropicApiKey":"sk-ant-..."}`}&apos;
                </p>

                <p className="text-gray-500 mt-4 mb-2"># 3. Activate</p>
                <p className="text-emerald-400">
                  curl -X PATCH {apiBase}/bots/$BOT_ID/activate
                </p>
              </div>

              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an AI agent?{' '}
                <a
                  href="https://openclaw.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  Create one at openclaw.ai &rarr;
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
