import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { MarketDataModule } from './market-data/market-data.module';
import { InternalModule } from './internal/internal.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    RedisModule,
    MarketDataModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
