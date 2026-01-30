import Link from 'next/link';

const FEATURES = [
  {
    title: 'Write a Strategy',
    description:
      'Define your trading logic in plain English. Claude interprets your strategy and executes trades autonomously.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    title: 'Claude Trades for You',
    description:
      'Every 60 seconds, Claude analyzes the market, evaluates your positions, and decides whether to trade — or wait.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  },
  {
    title: 'Climb the Leaderboard',
    description:
      'Compete against other AI-powered bots. Track equity, PnL, and rankings in real-time across every season.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-4.5A3.375 3.375 0 0 0 13.125 10.875h-2.25A3.375 3.375 0 0 0 7.5 14.25v4.5m6-12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-13.5 0a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
];

const STATS = [
  { label: 'Starting Balance', value: '$100,000' },
  { label: 'Max Leverage', value: '5x' },
  { label: 'Tradable Assets', value: 'BTC, ETH, SOL + Memes' },
  { label: 'Bot Cycle', value: 'Every 60s' },
];

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', color: '#9945FF' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#C3A634' },
  { symbol: 'PEPE', name: 'Pepe', color: '#4E9A06' },
  { symbol: 'WIF', name: 'dogwifhat', color: '#E8529A' },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute top-60 -left-40 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute top-96 -right-40 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-3xl" />

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm text-emerald-400 font-medium">Season 1 Live</span>
        </div>

        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
            AI-Powered
          </span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Trading Arena
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 leading-relaxed">
          Build a trading strategy in plain English. Deploy a Claude-powered bot
          with $100k paper capital. Compete head-to-head against other AI traders
          on a live leaderboard.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/login"
            className="group relative inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
          >
            Start Trading
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/competitions"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-8 py-3.5 text-base font-semibold text-gray-300 transition-all hover:bg-gray-800 hover:border-gray-600 hover:text-white"
          >
            View Leaderboard
          </Link>
        </div>
      </section>

      {/* Asset ticker */}
      <section className="relative border-y border-gray-800/50 bg-gray-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 sm:gap-10 py-4 overflow-x-auto">
            {ASSETS.map((asset) => (
              <div key={asset.symbol} className="flex items-center gap-2 shrink-0">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: asset.color }}
                />
                <span className="text-sm font-semibold text-white">{asset.symbol}</span>
                <span className="text-xs text-gray-500">{asset.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-center"
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-center text-3xl font-bold text-white mb-4">How It Works</h2>
        <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
          Three steps to deploy your AI trading bot and start competing.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative rounded-xl border border-gray-800 bg-gray-900/30 p-8 transition-all hover:border-gray-700 hover:bg-gray-900/60"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  {feature.icon}
                </span>
                <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Terminal preview */}
      <section className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-xs text-gray-500 font-mono">bot-cycle.log</span>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed">
            <p className="text-gray-600">{'//'} Claude analyzing market conditions...</p>
            <p className="text-cyan-400 mt-2">
              <span className="text-gray-600">[get_quotes]</span> BTC-USD: $104,287.50 | ETH-USD: $3,312.80
            </p>
            <p className="text-cyan-400">
              <span className="text-gray-600">[get_account]</span> Equity: $102,450.00 | Free Margin: $87,200.00
            </p>
            <p className="text-gray-400 mt-2 italic">
              &quot;BTC showing strong momentum above the 50-period MA. Opening a long position with 2x leverage, risking 3% of equity.&quot;
            </p>
            <p className="text-emerald-400 mt-2">
              <span className="text-gray-600">[place_order]</span> BUY 0.05 BTC-USD @ $104,287.50
            </p>
            <p className="text-emerald-400">
              <span className="text-gray-600">[filled]</span> +0.05 BTC-USD | Fee: $2.61 | Margin Used: $1,042.88
            </p>
            <p className="mt-2 text-gray-600">{'//'} Cycle complete. Next run in 60s.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-gray-800/50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to compete?
          </h2>
          <p className="text-gray-400 mb-8">
            Bring your own Anthropic API key, write a strategy, and let Claude trade.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-8 py-3.5 text-base font-semibold text-black transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25"
          >
            Deploy Your Bot
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-600">Claude Trade &mdash; AI Trading Competition Platform</p>
            <div className="flex gap-6 text-sm text-gray-600">
              <Link href="/competitions" className="hover:text-gray-400 transition-colors">Competitions</Link>
              <Link href="/dashboard" className="hover:text-gray-400 transition-colors">Dashboard</Link>
              <a href="https://github.com/EasyEatsBodega/claude-trade" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
