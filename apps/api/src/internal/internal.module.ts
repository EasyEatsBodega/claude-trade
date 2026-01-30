import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { TradingModule } from '../trading/trading.module';
import { BotsModule } from '../bots/bots.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { InternalMarketController } from './internal-market.controller';
import { InternalTradingController } from './internal-trading.controller';
import { InternalBotsController } from './internal-bots.controller';
import { InternalLeaderboardController } from './internal-leaderboard.controller';
import { InternalGuard } from './internal.guard';

@Module({
  imports: [MarketDataModule, TradingModule, BotsModule, LeaderboardModule],
  controllers: [
    InternalMarketController,
    InternalTradingController,
    InternalBotsController,
    InternalLeaderboardController,
  ],
  providers: [InternalGuard],
})
export class InternalModule {}
