import { Worker, type Job } from 'bullmq';
import type IORedis from 'ioredis';
import { JOB_NAMES } from '../queues';
import { runBotCycle } from './bot-runner';

export function createBotCycleWorker(connection: IORedis): Worker {
  const worker = new Worker(
    'bot-cycles',
    async (job: Job) => {
      if (job.name === JOB_NAMES.BOT_CYCLE) {
        const { botId } = job.data;
        return runBotCycle(botId);
      }
      console.warn(`Unknown bot-cycles job: ${job.name}`);
    },
    {
      connection,
      concurrency: 5, // Run up to 5 bot cycles in parallel
    },
  );

  worker.on('completed', (job, result) => {
    console.log(
      `[bot-cycles] ${job.data.botId} completed: ${result?.toolCalls ?? 0} calls, ${result?.ordersPlaced ?? 0} orders`,
    );
  });

  worker.on('failed', (job, err) => {
    console.error(`[bot-cycles] ${job?.data?.botId} failed:`, err.message);
  });

  return worker;
}
