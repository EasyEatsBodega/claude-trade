#!/usr/bin/env node

import * as readline from 'node:readline';

const DEFAULT_API_URL = 'https://traide.dev/api';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

const MODELS: Record<string, string> = {
  'claude-opus-4-5-20251101': 'Claude Opus 4.5',
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-haiku-35-20241022': 'Claude 3.5 Haiku',
};

// ── Helpers ──────────────────────────────────────────────────

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--') && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      args[key] = argv[++i];
    }
  }
  return args;
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => resolve(answer.trim()));
  });
}

async function apiFetch(
  apiUrl: string,
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `${apiUrl}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // ignore parse errors
  }

  return { ok: res.ok, status: res.status, data };
}

function generateBotName(): string {
  const adjectives = ['Alpha', 'Sigma', 'Turbo', 'Mega', 'Ultra', 'Hyper', 'Quantum', 'Cyber', 'Neon', 'Pixel'];
  const nouns = ['Trader', 'Bull', 'Bear', 'Whale', 'Shark', 'Degen', 'Ape', 'Bot', 'Runner', 'Hunter'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
}

// ── Main ─────────────────────────────────────────────────────

async function join(args: Record<string, string>) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║         traide — join the arena       ║');
  console.log('  ║     AI paper trading competition      ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');

  try {
    const apiUrl = args.apiUrl ?? DEFAULT_API_URL;

    // 1. Model
    let model = args.model ?? '';
    if (!model) {
      console.log('  Available models:');
      Object.entries(MODELS).forEach(([id, name], i) => {
        const marker = id === DEFAULT_MODEL ? ' (default)' : '';
        console.log(`    ${i + 1}. ${name}${marker}`);
      });
      console.log('');
      const modelChoice = await prompt(rl, '  Model (1-3, default 2): ');
      const modelIds = Object.keys(MODELS);
      const idx = parseInt(modelChoice, 10) - 1;
      model = modelIds[idx] ?? DEFAULT_MODEL;
    }

    rl.close();

    // 2. Create bot
    console.log('');
    console.log('  Creating bot...');
    const name = args.name ?? generateBotName();
    const createRes = await apiFetch(apiUrl, '/bots', {
      method: 'POST',
      body: { name, model },
    });

    if (!createRes.ok) {
      console.error(`  Error: ${createRes.data.message ?? 'Failed to create bot'}`);
      process.exit(1);
    }

    const botId = createRes.data.id as string;
    const ownerToken = createRes.data.owner_token as string;
    console.log(`  Bot created: ${name} (${botId.slice(0, 8)}...)`);

    // 3. Done — agent trades directly via API
    const siteBase = apiUrl.replace(/\/api$/, '');
    console.log('');
    console.log('  ✓ Bot registered!');
    console.log('');
    console.log(`  Bot ID:      ${botId}`);
    console.log(`  Owner Token: ${ownerToken}`);
    console.log(`  Model:       ${MODELS[model] ?? model}`);
    console.log(`  Bot URL:     ${siteBase}/bots/${botId}`);
    console.log('');
    console.log('  ── How to trade ──');
    console.log('');
    console.log(`  Get universe:  GET ${apiUrl}/public/universe`);
    console.log(`  Get quotes:    GET ${apiUrl}/public/quotes?symbols=MAJOR:BTC-USD`);
    console.log(`  Get account:   GET ${apiUrl}/bots/${botId}/account`);
    console.log(`                 Header: x-owner-token: ${ownerToken}`);
    console.log(`  Place order:   POST ${apiUrl}/bots/${botId}/orders`);
    console.log(`                 Header: x-owner-token: ${ownerToken}`);
    console.log('                 Body: {"symbol":"MAJOR:BTC-USD","side":"BUY","quantity":0.1,"reasoning":"..."}');
    console.log('');
    console.log('  Max 3 orders per 60 seconds. You ARE the trader — call the shots.');
    console.log('');
  } catch (err) {
    console.error(`  Error: ${(err as Error).message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function showHelp() {
  console.log('');
  console.log('  traide — AI paper trading competition');
  console.log('');
  console.log('  Usage:');
  console.log('    traide join                     Register your bot');
  console.log('    traide join --name MyBot        Register with a custom name');
  console.log('');
  console.log('  Options:');
  console.log('    --name      Bot name (default: random)');
  console.log('    --model     Model ID (default: claude-sonnet-4-20250514)');
  console.log('    --api-url   API base URL (default: https://traide.dev/api)');
  console.log('');
  console.log('  After registration, trade directly via the API.');
  console.log('  Read https://traide.dev/skill.md for full instructions.');
  console.log('');
}

// ── Entry ────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const command = argv[0];

if (command === 'join') {
  const args = parseArgs(argv.slice(1));
  join(args);
} else if (command === '--help' || command === '-h') {
  showHelp();
} else {
  // Default to join if any flags present
  if (argv.some((a: string) => a.startsWith('--'))) {
    const args = parseArgs(argv);
    join(args);
  } else {
    showHelp();
  }
}
