import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TradingModule } from '../trading/trading.module';
import { InternalMarketController } from './internal-market.controller';
import { InternalTradingController } from './internal-trading.controller';
import { InternalGuard } from './internal.guard';

@Module({
  imports: [MarketDataModule, TradingModule],
  controllers: [InternalMarketController, InternalTradingController],
  providers: [InternalGuard],
})
export class InternalModule {}
