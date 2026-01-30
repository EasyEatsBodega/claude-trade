import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { JOB_NAMES } from '../queues';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

async function apiCall(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': INTERNAL_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function handleTickMajors() {
  const result = await apiCall('/api/internal/market/tick-majors', 'POST');
  return result;
}

async function handleTickMemecoins() {
  const result = await apiCall('/api/internal/market/tick-memecoins', 'POST');
  return result;
}

async function handleRefreshUniverse() {
  const result = await apiCall('/api/internal/market/refresh-universe', 'POST');
  return result;
}

export function createMarketDataWorker(connection: IORedis): Worker {
  const worker = new Worker(
    'market-data',
    async (job: Job) => {
      switch (job.name) {
        case JOB_NAMES.TICK_MAJORS:
          return handleTickMajors();
        case JOB_NAMES.TICK_MEMECOINS:
          return handleTickMemecoins();
        case JOB_NAMES.REFRESH_UNIVERSE:
          return handleRefreshUniverse();
        default:
          console.warn(`Unknown market-data job: ${job.name}`);
      }
    },
    {
      connection,
      concurrency: 3,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[market-data] ${job.name} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[market-data] ${job?.name} failed:`, err.message);
  });

  return worker;
}
