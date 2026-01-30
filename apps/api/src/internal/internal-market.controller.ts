import { Controller, Post, UseGuards } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { InternalGuard } from './internal.guard';

@Controller('internal/market')
@UseGuards(InternalGuard)
export class InternalMarketController {
  constructor(private marketDataService: MarketDataService) {}

  @Post('tick-majors')
  async tickMajors() {
    const ticks = await this.marketDataService.fetchMajorsTicks();
    return { count: ticks.length, symbols: ticks.map((t) => t.symbol) };
  }

  @Post('tick-memecoins')
  async tickMemecoins() {
    const ticks = await this.marketDataService.fetchMemecoinTicks();
    return { count: ticks.length, symbols: ticks.map((t) => t.symbol) };
  }

  @Post('refresh-universe')
  async refreshUniverse() {
    const universe = await this.marketDataService.refreshUniverse();
    return {
      total: universe.length,
      majors: universe.filter((t) => t.isMajor).length,
      memecoins: universe.filter((t) => !t.isMajor).length,
    };
  }
}
