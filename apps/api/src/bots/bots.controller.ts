import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BotsService } from './bots.service';
import { TradingService } from '../trading/trading.service';

@Controller('bots')
export class BotsController {
  constructor(
    private botsService: BotsService,
    private tradingService: TradingService,
  ) {}

  private async requireOwner(botId: string, ownerToken?: string) {
    if (!ownerToken) {
      throw new ForbiddenException('Missing owner token');
    }
    const valid = await this.botsService.validateOwnerToken(botId, ownerToken);
    if (!valid) {
      throw new ForbiddenException('Invalid owner token');
    }
  }

  @Post()
  async createBot(
    @Body() body: { name: string; competitionId?: string; model?: string },
  ) {
    try {
      return await this.botsService.createBot(body);
    } catch (err) {
      throw new HttpException(
        (err as Error).message ?? 'Failed to create bot',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async getBot(@Param('id') id: string) {
    return this.botsService.getBot(id);
  }

  @Get(':id/status')
  async getBotStatus(@Param('id') id: string) {
    return this.botsService.getBotStatus(id);
  }

  @Patch(':id')
  async updateBot(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
    @Body() body: { name?: string; model?: string },
  ) {
    await this.requireOwner(id, ownerToken);
    return this.botsService.updateBot(id, body);
  }

  @Patch(':id/prompt')
  async updatePrompt(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
    @Body() body: { strategyPrompt: string },
  ) {
    await this.requireOwner(id, ownerToken);
    return this.botsService.updateStrategyPrompt(id, body.strategyPrompt);
  }

  @Patch(':id/secret')
  async setApiKey(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
    @Body() body: { apiKey?: string; anthropicApiKey?: string },
  ) {
    await this.requireOwner(id, ownerToken);
    const key = body.apiKey ?? body.anthropicApiKey ?? '';
    return this.botsService.setApiKey(id, key);
  }

  @Patch(':id/activate')
  async activateBot(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
  ) {
    await this.requireOwner(id, ownerToken);
    try {
      return await this.botsService.activateBot(id);
    } catch (err) {
      throw new HttpException(
        (err as Error).message ?? 'Failed to activate bot',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/deactivate')
  async deactivateBot(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
  ) {
    await this.requireOwner(id, ownerToken);
    return this.botsService.deactivateBot(id);
  }

  // ── Agent trading endpoints ──────────────────────────────

  @Get(':id/account')
  async getAccount(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
  ) {
    await this.requireOwner(id, ownerToken);
    return this.botsService.getBotAccount(id);
  }

  @Post(':id/orders')
  async placeOrder(
    @Param('id') id: string,
    @Headers('x-owner-token') ownerToken: string,
    @Body()
    body: {
      symbol: string;
      side: 'BUY' | 'SELL';
      quantity: number;
      leverage?: number;
      reasoning?: string;
    },
  ) {
    await this.requireOwner(id, ownerToken);

    // Rate limit: max 3 orders per 60s per bot
    await this.botsService.checkOrderRateLimit(id);

    const accountId = await this.botsService.getAccountIdForBot(id);
    if (!accountId) {
      throw new HttpException('Bot has no trading account', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.tradingService.placeOrder({
        accountId,
        symbol: body.symbol,
        side: body.side,
        quantity: body.quantity,
        leverage: body.leverage ?? 1,
        reasoning: typeof body.reasoning === 'string'
          ? body.reasoning.slice(0, 280)
          : undefined,
      });
      return result;
    } catch (err) {
      throw new HttpException(
        (err as Error).message ?? 'Order failed',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
