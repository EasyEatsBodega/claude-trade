import IORedis from 'ioredis';

function createRedisConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    throw new Error('UPSTASH_REDIS_URL is required');
  }

  return new IORedis(url, {
    maxRetriesPerRequest: null, // Required for BullMQ
    connectTimeout: 30000,
    lazyConnect: true,
    keepAlive: 10000,
  });
}

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
  console.log('Worker ready. Waiting for jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down worker...');
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
