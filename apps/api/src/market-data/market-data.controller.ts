import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketDataService } from './market-data.service';

@Controller()
export class MarketDataController {
  constructor(private marketDataService: MarketDataService) {}

  @Get('public/universe')
  async getUniverse() {
    return this.marketDataService.getUniverse();
  }

  @Get('public/quotes/:symbol')
  async getQuote(@Param('symbol') symbol: string) {
    const quote = await this.marketDataService.getQuote(symbol);
    if (!quote) {
      return { symbol, price: null, error: 'No recent quote available' };
    }
    return quote;
  }

  @Get('public/quotes')
  async getQuotes(@Query('symbols') symbols: string) {
    if (!symbols) {
      return { error: 'symbols query parameter required (comma-separated)' };
    }
    const symbolList = symbols.split(',').map((s) => s.trim());
    return this.marketDataService.getQuotes(symbolList);
  }

  @Get('public/market-health')
  async healthCheck() {
    return this.marketDataService.healthCheck();
  }
}
