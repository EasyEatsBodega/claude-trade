import { createRedisConnection } from './redis';
import { createQueues } from './queues';
import { createMarketDataWorker } from './market/price-worker';
import { scheduleMarketDataJobs } from './market/schedule';
import { createBotCycleWorker } from './bot-runner/bot-cycle-worker';
import { syncBotSchedules } from './bot-runner/schedule';
import { createLeaderboardWorker } from './jobs/leaderboard-worker';
import { scheduleLeaderboardJobs } from './jobs/schedule';

const BOT_SYNC_INTERVAL = 30_000; // Sync bot schedules every 30s

async function main() {
  console.log('Claude Trade Worker starting...');

  const redis = createRedisConnection();

  redis.on('connect', () => {
    console.log('Connected to Redis');
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });

  await redis.connect();

  // Create queues
  const { marketDataQueue, botCycleQueue, leaderboardQueue } =
    createQueues(redis);

  // Start workers
  const marketWorker = createMarketDataWorker(redis);
  console.log('Market data worker started');

  const botWorker = createBotCycleWorker(redis);
  console.log('Bot cycle worker started');

  const leaderboardWorker = createLeaderboardWorker(redis);
  console.log('Leaderboard worker started');

  // Schedule repeatable jobs
  await scheduleMarketDataJobs(marketDataQueue);
  await scheduleLeaderboardJobs(leaderboardQueue);

  // Sync bot schedules periodically
  await syncBotSchedules(botCycleQueue);
  const syncInterval = setInterval(
    () => syncBotSchedules(botCycleQueue),
    BOT_SYNC_INTERVAL,
  );

  console.log('Worker ready. Processing jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    clearInterval(syncInterval);
    await marketWorker.close();
    await botWorker.close();
    await leaderboardWorker.close();
    await marketDataQueue.close();
    await botCycleQueue.close();
    await leaderboardQueue.close();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});
