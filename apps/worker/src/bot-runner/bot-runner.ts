import Anthropic from '@anthropic-ai/sdk';
import { BOT_RULES_PACK } from './rules-pack';
import { CLAUDE_TOOLS } from './tools/definitions';
import { CycleGuard } from './cycle-guard';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = process.env.API_URL ?? 'http://localhost:4000';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

async function apiCall(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': INTERNAL_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

interface BotData {
  id: string;
  name: string;
  model: string;
  bot_config: Array<{ strategy_prompt: string }>;
  accounts: Array<{ id: string; status: string }>;
}

export async function runBotCycle(botId: string): Promise<{
  success: boolean;
  toolCalls: number;
  ordersPlaced: number;
  error?: string;
}> {
  const cycleId = uuidv4();
  const startTime = Date.now();

  console.log(`[bot-runner] Starting cycle ${cycleId} for bot ${botId}`);

  // 1. Load bot data
  const bot = await apiCall(`/api/internal/bots/${botId}`) as BotData;

  // 2. Check account is ACTIVE
  const account = bot.accounts?.[0];
  if (!account || account.status !== 'ACTIVE') {
    console.log(`[bot-runner] Bot ${botId} account not ACTIVE (${account?.status}), skipping`);
    return { success: false, toolCalls: 0, ordersPlaced: 0, error: `Account ${account?.status}` };
  }

  // 3. Get API key
  const keyData = await apiCall(`/api/internal/bots/${botId}/api-key`) as { hasKey: boolean; apiKey?: string };
  if (!keyData.hasKey) {
    console.log(`[bot-runner] Bot ${botId} has no API key, skipping`);
    return { success: false, toolCalls: 0, ordersPlaced: 0, error: 'No API key' };
  }

  // 4. Get strategy prompt
  const strategyPrompt = bot.bot_config?.[0]?.strategy_prompt;
  if (!strategyPrompt) {
    console.log(`[bot-runner] Bot ${botId} has no strategy prompt, skipping`);
    return { success: false, toolCalls: 0, ordersPlaced: 0, error: 'No strategy prompt' };
  }

  // 5. Initialize Claude client
  const client = new Anthropic({ apiKey: keyData.apiKey });
  const guard = new CycleGuard();

  const systemPrompt = `${BOT_RULES_PACK}\n\n---\n\n${strategyPrompt}`;

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `A new trading cycle has started. Analyze the market and decide whether to trade. Remember: you MUST call get_account and get_quotes before placing any order.`,
    },
  ];

  try {
    // 6. Tool-use loop
    let iteration = 0;
    const maxIterations = 10; // safety net

    while (iteration < maxIterations) {
      iteration++;

      const response = await client.messages.create({
        model: bot.model,
        max_tokens: 4096,
        system: systemPrompt,
        tools: CLAUDE_TOOLS,
        messages,
      });

      // Check if response has tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ContentBlockParam & { type: 'tool_use' } =>
          block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls — end of cycle
        break;
      }

      // Add assistant message with all content
      messages.push({ role: 'assistant', content: response.content });

      // Process each tool call
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const { allowed, reason } = guard.recordToolCall(toolUse.name);

        if (!allowed) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: reason }),
            is_error: true,
          });
          continue;
        }

        // Execute tool
        const result = await executeToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          account.id,
          cycleId,
        );

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      messages.push({ role: 'user', content: toolResults });

      // If stop reason is end_turn, we're done
      if (response.stop_reason === 'end_turn') {
        break;
      }
    }

    const stats = guard.getStats();
    const durationMs = Date.now() - startTime;

    console.log(
      `[bot-runner] Cycle ${cycleId} completed: ${stats.toolCalls} tool calls, ${stats.orders} orders, ${durationMs}ms`,
    );

    return {
      success: true,
      toolCalls: stats.toolCalls,
      ordersPlaced: stats.orders,
    };
  } catch (err) {
    const error = err as Error;
    console.error(`[bot-runner] Cycle ${cycleId} failed:`, error.message);
    return {
      success: false,
      toolCalls: guard.getStats().toolCalls,
      ordersPlaced: guard.getStats().orders,
      error: error.message,
    };
  }
}

async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  accountId: string,
  cycleId: string,
): Promise<unknown> {
  switch (toolName) {
    case 'get_universe':
      return apiCall('/api/public/universe');

    case 'get_quotes': {
      const symbols = (input.symbols as string[]) ?? [];
      return apiCall(`/api/public/quotes?symbols=${symbols.join(',')}`);
    }

    case 'get_account':
      return apiCall(`/api/internal/account/${accountId}`);

    case 'place_order':
      return apiCall('/api/internal/orders', 'POST', {
        accountId,
        symbol: input.symbol,
        side: input.side,
        quantity: input.quantity,
        leverage: input.leverage ?? 1,
        cycleId,
      });

    case 'no_trade':
      return { status: 'ok', reason: input.reason };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
