import { BOT_LIMITS } from '@claude-trade/shared';

export class CycleGuard {
  private toolCallCount = 0;
  private orderCount = 0;
  private calledGetAccount = false;
  private calledGetQuotes = false;

  recordToolCall(toolName: string): { allowed: boolean; reason?: string } {
    this.toolCallCount++;

    if (this.toolCallCount > BOT_LIMITS.MAX_TOOL_CALLS_PER_CYCLE) {
      return {
        allowed: false,
        reason: `Exceeded max tool calls per cycle (${BOT_LIMITS.MAX_TOOL_CALLS_PER_CYCLE})`,
      };
    }

    if (toolName === 'get_account') {
      this.calledGetAccount = true;
    }

    if (toolName === 'get_quotes') {
      this.calledGetQuotes = true;
    }

    if (toolName === 'place_order') {
      this.orderCount++;

      if (this.orderCount > BOT_LIMITS.MAX_ORDERS_PER_CYCLE) {
        return {
          allowed: false,
          reason: `Exceeded max orders per cycle (${BOT_LIMITS.MAX_ORDERS_PER_CYCLE})`,
        };
      }

      if (!this.calledGetAccount) {
        return {
          allowed: false,
          reason: 'Must call get_account before placing an order',
        };
      }

      if (!this.calledGetQuotes) {
        return {
          allowed: false,
          reason: 'Must call get_quotes before placing an order',
        };
      }
    }

    return { allowed: true };
  }

  getStats() {
    return {
      toolCalls: this.toolCallCount,
      orders: this.orderCount,
      calledGetAccount: this.calledGetAccount,
      calledGetQuotes: this.calledGetQuotes,
    };
  }
}
