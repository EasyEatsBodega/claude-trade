import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { JOB_NAMES } from '../queues';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

async function apiCall(path: string, method = 'POST') {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': INTERNAL_TOKEN,
    },
  });
  return res.json();
}

async function handleEquitySnapshot() {
  const result = await apiCall('/api/internal/equity-snapshots');
  console.log(`[leaderboard] Equity snapshots created:`, result);
  return result;
}

async function handleLeaderboardSnapshot() {
  // Get active competitions, then snapshot each
  const competitions = await apiCall(
    '/api/internal/competitions/active',
    'GET',
  );

  if (!Array.isArray(competitions) || competitions.length === 0) {
    console.log('[leaderboard] No active competitions to snapshot');
    return { snapshots: 0 };
  }

  for (const comp of competitions) {
    await apiCall(`/api/internal/leaderboard/snapshot/${comp.id}`);
  }

  console.log(
    `[leaderboard] Snapshots created for ${competitions.length} competitions`,
  );
  return { snapshots: competitions.length };
}

async function handleLiquidationSweep() {
  const result = await apiCall('/api/internal/liquidation-sweep');
  console.log(`[leaderboard] Liquidation sweep:`, result);
  return result;
}

export function createLeaderboardWorker(connection: IORedis): Worker {
  const worker = new Worker(
    'leaderboard',
    async (job: Job) => {
      switch (job.name) {
        case JOB_NAMES.EQUITY_SNAPSHOT:
          return handleEquitySnapshot();
        case JOB_NAMES.LEADERBOARD_SNAPSHOT:
          return handleLeaderboardSnapshot();
        case JOB_NAMES.LIQUIDATION_SWEEP:
          return handleLiquidationSweep();
        default:
          console.warn(`Unknown leaderboard job: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[leaderboard] ${job.name} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[leaderboard] ${job?.name} failed:`, err.message);
  });

  return worker;
}
