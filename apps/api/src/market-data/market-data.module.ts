import { Module } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { OutlierDetector } from './outlier-detector';
import { KrakenAdapter } from './sources/kraken.source';
import { CoinbaseAdapter } from './sources/coinbase.source';
import { DexScreenerAdapter } from './sources/dexscreener.source';

@Module({
  providers: [
    MarketDataService,
    OutlierDetector,
    KrakenAdapter,
    CoinbaseAdapter,
    DexScreenerAdapter,
  ],
  controllers: [MarketDataController],
  exports: [MarketDataService],
})
export class MarketDataModule {}
