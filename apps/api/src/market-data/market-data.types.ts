export interface Tick {
  symbol: string;
  price: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  source: string;
  ts: number;
}

export interface MarketDataAdapter {
  name: string;
  fetchTicks(params: { symbols?: string[] }): Promise<Tick[]>;
  healthCheck(): Promise<{ ok: boolean; detail?: string }>;
}

export interface UniverseToken {
  symbol: string;
  chain?: string;
  address?: string;
  name: string;
  isMajor: boolean;
  liquidityUsd?: number;
  volume24hUsd?: number;
  pairCreatedAt?: string;
}
