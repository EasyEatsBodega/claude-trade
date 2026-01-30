import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TradingModule } from '../trading/trading.module';
import { BotsModule } from '../bots/bots.module';
import { InternalMarketController } from './internal-market.controller';
import { InternalTradingController } from './internal-trading.controller';
import { InternalBotsController } from './internal-bots.controller';
import { InternalGuard } from './internal.guard';

@Module({
  imports: [MarketDataModule, TradingModule, BotsModule],
  controllers: [
    InternalMarketController,
    InternalTradingController,
    InternalBotsController,
  ],
  providers: [InternalGuard],
})
export class InternalModule {}
