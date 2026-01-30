import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { InternalMarketController } from './internal-market.controller';
import { InternalGuard } from './internal.guard';

@Module({
  imports: [MarketDataModule],
  controllers: [InternalMarketController],
  providers: [InternalGuard],
})
export class InternalModule {}
