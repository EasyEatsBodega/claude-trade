import { z } from 'zod';

// ── Order Schemas ──

export const PlaceOrderSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().positive(),
  leverage: z.number().min(1).max(5).optional().default(1),
});

export const GetQuotesSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(20),
});

export const NoTradeSchema = z.object({
  reason: z.string().min(1).max(500),
});

// ── Bot Schemas ──

export const CreateBotSchema = z.object({
  name: z.string().min(1).max(50),
  competitionId: z.string().uuid(),
  model: z.string().optional().default('claude-sonnet-4-5-20250929'),
});

export const UpdateBotSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  model: z.string().optional(),
});

export const UpdateStrategyPromptSchema = z.object({
  strategyPrompt: z.string().min(10).max(10_000),
});

export const SetApiKeySchema = z.object({
  apiKey: z.string().min(10).max(200),
});

// ── Competition Schemas ──

export const CreateCompetitionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  startingBalance: z.number().positive().optional().default(100_000),
  maxBotsPerUser: z.number().int().min(1).max(10).optional().default(3),
});

// ── Tick Schema ──

export const TickSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  liquidityUsd: z.number().optional(),
  volume24hUsd: z.number().optional(),
  source: z.string().min(1),
  ts: z.number().int().positive(),
});
