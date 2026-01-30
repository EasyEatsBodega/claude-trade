import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BotsModule } from '../bots/bots.module';

@Module({
  imports: [BotsModule],
  controllers: [AdminController],
})
export class AdminModule {}
