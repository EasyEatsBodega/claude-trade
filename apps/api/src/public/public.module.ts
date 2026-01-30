import { Module } from '@nestjs/common';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { PublicController } from './public.controller';

@Module({
  imports: [LeaderboardModule],
  controllers: [PublicController],
})
export class PublicModule {}
