import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TradingService, type PlaceOrderParams } from '../trading/trading.service';
import { InternalGuard } from './internal.guard';

@Controller('internal/orders')
@UseGuards(InternalGuard)
export class InternalTradingController {
  constructor(private tradingService: TradingService) {}

  @Post()
  async placeOrder(@Body() body: PlaceOrderParams) {
    return this.tradingService.placeOrder(body);
  }
}
