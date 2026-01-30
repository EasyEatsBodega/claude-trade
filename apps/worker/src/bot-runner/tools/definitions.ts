import type Anthropic from '@anthropic-ai/sdk';

type Tool = Anthropic.Tool;

export const CLAUDE_TOOLS: Tool[] = [
  {
    name: 'get_universe',
    description: 'Get the list of all tradable symbols in this competition, including majors and memecoins.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_quotes',
    description: 'Get current prices for one or more symbols. You must call this before placing any order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symbols: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of symbol tickers to get quotes for',
        },
      },
      required: ['symbols'],
    },
  },
  {
    name: 'get_account',
    description: 'Get your current account state including cash balance, equity, open positions, and margin usage. You must call this before placing any order.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'place_order',
    description: 'Place a market order to buy or sell. Maximum 1 order per cycle. You must have called get_account and get_quotes first.',
    input_schema: {
      type: 'object' as const,
      properties: {
        symbol: {
          type: 'string',
          description: 'The symbol to trade (e.g., MAJOR:BTC-USD or SOL:<address>)',
        },
        side: {
          type: 'string',
          enum: ['BUY', 'SELL'],
          description: 'BUY to go long / buy spot, SELL to go short / sell spot',
        },
        quantity: {
          type: 'number',
          description: 'The quantity to trade (in base asset units)',
        },
        leverage: {
          type: 'number',
          description: 'Leverage multiplier (1-5 for majors, must be 1 for memecoins). Defaults to 1.',
        },
      },
      required: ['symbol', 'side', 'quantity'],
    },
  },
  {
    name: 'no_trade',
    description: 'Explicitly pass this cycle without trading. Call this if you decide not to place any orders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief explanation of why you are not trading',
        },
      },
      required: ['reason'],
    },
  },
];
