import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BotsService } from '../bots/bots.service';
import { InternalGuard } from './internal.guard';

@Controller('internal/bots')
@UseGuards(InternalGuard)
export class InternalBotsController {
  constructor(private botsService: BotsService) {}

  @Get(':id')
  async getBot(@Param('id') id: string) {
    return this.botsService.getBot(id);
  }

  @Get(':id/api-key')
  async getApiKey(@Param('id') id: string) {
    const key = await this.botsService.decryptApiKey(id);
    if (!key) {
      return { hasKey: false };
    }
    return { hasKey: true, apiKey: key };
  }
}
