import type { Queue } from 'bullmq';
import { JOB_NAMES } from '../queues';
import { BOT_LIMITS } from '@claude-trade/shared';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

/**
 * Sync active bots from the API and schedule their cycles as repeatable jobs.
 */
export async function syncBotSchedules(queue: Queue): Promise<void> {
  try {
    // Fetch all active bots
    const res = await fetch(`${API_BASE}/api/internal/bots/active`, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
    });

    if (!res.ok) {
      console.warn('[bot-scheduler] Failed to fetch active bots:', res.status);
      return;
    }

    const activeBots = await res.json() as { id: string }[];
    console.log(`[bot-scheduler] Found ${activeBots.length} active bots:`, activeBots.map(b => b.id));

    // Get current repeatable jobs
    const existing = await queue.getRepeatableJobs();
    const existingBotIds = new Set(
      existing
        .filter((j) => j.name === JOB_NAMES.BOT_CYCLE)
        .map((j) => j.id ?? ''),
    );

    const activeBotIds = new Set(activeBots.map((b) => b.id));

    // Remove jobs for deactivated bots
    for (const job of existing) {
      if (job.name === JOB_NAMES.BOT_CYCLE && job.id && !activeBotIds.has(job.id)) {
        await queue.removeRepeatableByKey(job.key);
        console.log(`[bot-scheduler] Removed schedule for bot ${job.id}`);
      }
    }

    // Add jobs for new active bots
    for (const bot of activeBots) {
      if (!existingBotIds.has(bot.id)) {
        await queue.add(
          JOB_NAMES.BOT_CYCLE,
          { botId: bot.id },
          {
            repeat: { every: BOT_LIMITS.CYCLE_INTERVAL_MS },
            jobId: bot.id,
            removeOnComplete: { count: 50 },
            removeOnFail: { count: 20 },
          },
        );
        console.log(`[bot-scheduler] Scheduled bot ${bot.id} every ${BOT_LIMITS.CYCLE_INTERVAL_MS}ms`);
      }
    }
  } catch (err) {
    console.error('[bot-scheduler] Sync failed:', (err as Error).message);
  }
}
