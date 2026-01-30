import { Queue } from 'bullmq';
import type IORedis from 'ioredis';

export function createQueues(connection: IORedis) {
  const marketDataQueue = new Queue('market-data', { connection });
  const botCycleQueue = new Queue('bot-cycles', { connection });
  const leaderboardQueue = new Queue('leaderboard', { connection });

  return { marketDataQueue, botCycleQueue, leaderboardQueue };
}

export const JOB_NAMES = {
  TICK_MAJORS: 'tick-majors',
  TICK_MEMECOINS: 'tick-memecoins',
  REFRESH_UNIVERSE: 'refresh-universe',
  BOT_CYCLE: 'bot-cycle',
  EQUITY_SNAPSHOT: 'equity-snapshot',
  LEADERBOARD_SNAPSHOT: 'leaderboard-snapshot',
  LIQUIDATION_SWEEP: 'liquidation-sweep',
} as const;
