import type { Queue } from 'bullmq';
import { JOB_NAMES } from '../queues';

export async function scheduleLeaderboardJobs(queue: Queue) {
  // Remove existing repeatable jobs
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Equity snapshots every 5 minutes
  await queue.add(
    JOB_NAMES.EQUITY_SNAPSHOT,
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    },
  );

  // Leaderboard snapshots every 5 minutes (offset by 30s from equity)
  await queue.add(
    JOB_NAMES.LEADERBOARD_SNAPSHOT,
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    },
  );

  // Liquidation sweep every 60 seconds
  await queue.add(
    JOB_NAMES.LIQUIDATION_SWEEP,
    {},
    {
      repeat: { every: 60_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  );

  console.log('[leaderboard] Scheduled repeatable jobs');
}
