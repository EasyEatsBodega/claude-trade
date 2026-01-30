import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BotsService } from '../bots/bots.service';
import { InternalGuard } from './internal.guard';

@Controller('internal/bots')
@UseGuards(InternalGuard)
export class InternalBotsController {
  private supabase: SupabaseClient;

  constructor(
    private botsService: BotsService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  // Static routes MUST come before :id to avoid NestJS matching "active" as an id
  @Get('active')
  async getActiveBots() {
    const { data } = await this.supabase
      .from('bots')
      .select('id')
      .eq('is_active', true);

    return data ?? [];
  }

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
