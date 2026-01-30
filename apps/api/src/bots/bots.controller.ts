import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { BotsService } from './bots.service';

@Controller('bots')
export class BotsController {
  constructor(private botsService: BotsService) {}

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

  @Patch(':id')
  async updateBot(
    @Param('id') id: string,
    @Body() body: { name?: string; model?: string },
  ) {
    return this.botsService.updateBot(id, body);
  }

  @Patch(':id/prompt')
  async updatePrompt(
    @Param('id') id: string,
    @Body() body: { strategyPrompt: string },
  ) {
    return this.botsService.updateStrategyPrompt(id, body.strategyPrompt);
  }

  @Patch(':id/secret')
  async setApiKey(
    @Param('id') id: string,
    @Body() body: { apiKey?: string; anthropicApiKey?: string },
  ) {
    const key = body.apiKey ?? body.anthropicApiKey ?? '';
    return this.botsService.setApiKey(id, key);
  }

  @Patch(':id/activate')
  async activateBot(@Param('id') id: string) {
    return this.botsService.activateBot(id);
  }

  @Patch(':id/deactivate')
  async deactivateBot(@Param('id') id: string) {
    return this.botsService.deactivateBot(id);
  }
}
