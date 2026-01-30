import IORedis from 'ioredis';

export function createRedisConnection(): IORedis {
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
