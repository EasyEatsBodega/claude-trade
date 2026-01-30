// ── Domain Types ──

export type AccountState = 'ACTIVE' | 'ZEROED' | 'LIQUIDATED' | 'ENDED';
export type OrderSide = 'BUY' | 'SELL';
export type PositionSide = 'LONG' | 'SHORT';
export type OrderStatus = 'PENDING' | 'FILLED' | 'REJECTED' | 'CANCELLED';
export type CompetitionStatus = 'upcoming' | 'active' | 'ended';
export type MemecoinChain = 'solana' | 'base';

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  xHandle: string | null;
  createdAt: string;
}

export interface Competition {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  startAt: string;
  endAt: string;
  startingBalance: number;
  maxBotsPerUser: number;
  status: CompetitionStatus;
}

export interface Bot {
  id: string;
  userId: string;
  competitionId: string;
  name: string;
  model: string;
  createdAt: string;
}

export interface BotConfig {
  id: string;
  botId: string;
  strategyPrompt: string;
  maxPositionPct: number;
  riskProfile: string;
}

export interface Account {
  id: string;
  botId: string;
  competitionId: string;
  cash: number;
  equity: number;
  marginUsed: number;
  status: AccountState;
  zeroedAt: string | null;
  liquidatedAt: string | null;
  deathReason: string | null;
}

export interface Position {
  id: string;
  accountId: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  avgEntryPrice: number;
  currentPrice: number | null;
  unrealizedPnl: number;
  realizedPnl: number;
  isOpen: boolean;
  openedAt: string;
  closedAt: string | null;
}

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  filledPrice: number | null;
  status: OrderStatus;
  rejectReason: string | null;
  leverage: number;
  fee: number;
  slippage: number;
  cycleId: string | null;
  createdAt: string;
}

export interface Trade {
  id: string;
  orderId: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  fee: number;
  realizedPnl: number | null;
  executedAt: string;
}

export interface Tick {
  symbol: string;
  price: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  source: string;
  ts: number;
}

export interface EquitySnapshot {
  id: number;
  accountId: string;
  equity: number;
  cash: number;
  positionsValue: number;
  snapshotAt: string;
}

export interface LeaderboardEntry {
  botId: string;
  botName: string;
  ownerDisplayName: string;
  rank: number;
  equity: number;
  returnPct: number;
  accountState: AccountState;
}

export interface AccountEvent {
  id: number;
  accountId: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ── Bot Runner Types ──

export interface CycleResult {
  botId: string;
  cycleId: string;
  toolCalls: number;
  ordersPlaced: number;
  orderResult: Order | null;
  error: string | null;
  durationMs: number;
}

export interface PlaceOrderInput {
  symbol: string;
  side: OrderSide;
  quantity: number;
  leverage?: number;
}

export interface GetQuotesInput {
  symbols: string[];
}

export interface NoTradeInput {
  reason: string;
}
