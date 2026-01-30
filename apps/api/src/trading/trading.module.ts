import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TradingService } from './trading.service';
import { OrderValidator } from './order-validator';
import { FeeCalculator } from './fee-calculator';
import { MarginCalculator } from './margin-calculator';
import { PositionManager } from './position-manager';
import { AccountLifecycle } from './account-lifecycle';

@Module({
  imports: [MarketDataModule],
  providers: [
    TradingService,
    OrderValidator,
    FeeCalculator,
    MarginCalculator,
    PositionManager,
    AccountLifecycle,
  ],
  exports: [TradingService, MarginCalculator, FeeCalculator, AccountLifecycle],
})
export class TradingModule {}
