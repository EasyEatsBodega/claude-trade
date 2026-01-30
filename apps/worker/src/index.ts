import { createRedisConnection } from './redis';
import { createQueues } from './queues';
import { createMarketDataWorker } from './market/price-worker';
import { scheduleMarketDataJobs } from './market/schedule';

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
  const { marketDataQueue } = createQueues(redis);

  // Start workers
  const marketWorker = createMarketDataWorker(redis);
  console.log('Market data worker started');

  // Schedule repeatable jobs
  await scheduleMarketDataJobs(marketDataQueue);

  console.log('Worker ready. Processing jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
    await marketWorker.close();
    await marketDataQueue.close();
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
