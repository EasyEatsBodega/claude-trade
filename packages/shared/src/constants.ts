// ── Trading Constants (Authoritative) ──

export const LEVERAGE_CAP = 5;
export const MAINTENANCE_RATIO = 0.5;
export const ZERO_EPSILON = 0.01;

export const FEES = {
  MAJORS_BPS: 5,
  MEMECOINS_BPS: 30,
} as const;

export const SLIPPAGE = {
  MAJORS_BPS: 5,
  MEMECOINS_BASE_BPS: 10,
  MAX_BPS: 200,
} as const;

export const BOT_LIMITS = {
  MAX_TOOL_CALLS_PER_CYCLE: 15,
  MAX_ORDERS_PER_CYCLE: 3,
  CYCLE_INTERVAL_MS: 60_000,
} as const;

export const STARTING_BALANCE = 10_000;

export const ACCOUNT_STATES = {
  ACTIVE: 'ACTIVE',
  ZEROED: 'ZEROED',
  LIQUIDATED: 'LIQUIDATED',
  ENDED: 'ENDED',
} as const;

export const ORDER_SIDES = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export const POSITION_SIDES = {
  LONG: 'LONG',
  SHORT: 'SHORT',
} as const;

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export const COMPETITION_STATUSES = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  ENDED: 'ended',
} as const;

export const MAJORS_ALLOWLIST = [
  'MAJOR:BTC-USD',
  'MAJOR:ETH-USD',
  'MAJOR:SOL-USD',
  'MAJOR:AVAX-USD',
  'MAJOR:LINK-USD',
  'MAJOR:DOGE-USD',
  'MAJOR:ADA-USD',
] as const;

export const MEMECOIN_CHAINS = ['solana', 'base'] as const;

export const UNIVERSE_FILTERS = {
  MIN_LIQUIDITY_USD: 50_000,
  MIN_VOLUME_24H_USD: 25_000,
  MIN_PAIR_AGE_MS: 24 * 60 * 60 * 1000,
} as const;

export const PRICE_STALENESS_MS = 60_000;

export const OUTLIER_DETECTION = {
  ROLLING_WINDOW_SIZE: 5,
  MAX_DEVIATION_PCT: 20,
} as const;
