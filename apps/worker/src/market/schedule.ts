import type { Queue } from 'bullmq';
import { JOB_NAMES } from '../queues';

export async function scheduleMarketDataJobs(queue: Queue) {
  // Remove any existing repeatable jobs first
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Tick majors every 10 seconds
  await queue.add(
    JOB_NAMES.TICK_MAJORS,
    {},
    {
      repeat: { every: 10_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  // Tick memecoins every 15 seconds
  await queue.add(
    JOB_NAMES.TICK_MEMECOINS,
    {},
    {
      repeat: { every: 15_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  // Refresh universe every 10 minutes
  await queue.add(
    JOB_NAMES.REFRESH_UNIVERSE,
    {},
    {
      repeat: { every: 10 * 60 * 1000 },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  );

  console.log('[market-data] Scheduled repeatable jobs');
}
