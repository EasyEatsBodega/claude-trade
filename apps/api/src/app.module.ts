import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { CryptoModule } from './crypto/crypto.module';
import { MarketDataModule } from './market-data/market-data.module';
import { TradingModule } from './trading/trading.module';
import { BotsModule } from './bots/bots.module';
import { InternalModule } from './internal/internal.module';
import { PublicModule } from './public/public.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    RedisModule,
    CryptoModule,
    MarketDataModule,
    TradingModule,
    BotsModule,
    InternalModule,
    PublicModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
