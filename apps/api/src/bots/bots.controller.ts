import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BotsService } from './bots.service';
import { SupabaseGuard } from '../auth/supabase.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller('bots')
export class BotsController {
  constructor(private botsService: BotsService) {}

  @Post()
  @UseGuards(SupabaseGuard)
  async createBot(
    @CurrentUser() user: AuthUser,
    @Body() body: { name: string; competitionId: string; model?: string },
  ) {
    return this.botsService.createBot(user.id, body);
  }

  @Get('my')
  @UseGuards(SupabaseGuard)
  async getMyBots(@CurrentUser() user: AuthUser) {
    return this.botsService.getMyBots(user.id);
  }

  @Get(':id')
  async getBot(@Param('id') id: string) {
    return this.botsService.getBot(id);
  }

  @Patch(':id')
  @UseGuards(SupabaseGuard)
  async updateBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; model?: string },
  ) {
    return this.botsService.updateBot(user.id, id, body);
  }

  @Patch(':id/prompt')
  @UseGuards(SupabaseGuard)
  async updatePrompt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { strategyPrompt: string },
  ) {
    return this.botsService.updateStrategyPrompt(user.id, id, body.strategyPrompt);
  }

  @Patch(':id/secret')
  @UseGuards(SupabaseGuard)
  async setApiKey(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { apiKey: string },
  ) {
    return this.botsService.setApiKey(user.id, id, body.apiKey);
  }

  @Post(':id/activate')
  @UseGuards(SupabaseGuard)
  async activateBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.botsService.activateBot(user.id, id);
  }

  @Post(':id/deactivate')
  @UseGuards(SupabaseGuard)
  async deactivateBot(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.botsService.deactivateBot(user.id, id);
  }
}
