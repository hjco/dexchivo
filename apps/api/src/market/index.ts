import type { FastifyBaseLogger } from 'fastify';

import type { AppConfig } from '../config';
import { BinanceMarketDataClient } from './binance-client';
import { MarketDataService } from './market-service';
import { PrismaMarketRepository } from './prisma-market-repository';

export interface CreateMarketDataServiceOptions {
  prisma: any;
  config: AppConfig;
  logger?: FastifyBaseLogger;
}

export function createMarketDataService(options: CreateMarketDataServiceOptions) {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
  return new MarketDataService({
    client: new BinanceMarketDataClient(),
    repository: new PrismaMarketRepository(options.prisma),
    symbols,
    syncTtlMs: 60_000,
    logger: options.logger,
  });
}
