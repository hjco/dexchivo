import type { FastifyBaseLogger } from 'fastify';

import type { AppConfig } from './config';
import { createAuthService } from './auth';
import type { AuthService } from './auth/auth-service';
import { PrismaAuthStore } from './auth/prisma-auth-store';
import { createMarketDataService } from './market';
import type { MarketDataService } from './market/market-service';
import { createReadinessCheck } from './readiness';
// import { HealthCheck } from './routes/health'; 
import { registerHealthRoutes } from './routes/health';

export interface AppServices {
  authService: AuthService;
  marketService: MarketDataService;
  readiness: () => Promise<HealthCheck[]>;
  close: () => Promise<void>;
}

export interface CreateServicesOptions {
  config: AppConfig;
  prisma: any;
  redisUrl: string;
  logger?: FastifyBaseLogger;
}

export function createServices(options: CreateServicesOptions): AppServices {
  const prisma = options.prisma;
  const authService = createAuthService({
    store: new PrismaAuthStore(prisma),
    config: options.config,
    logger: options.logger,
  });
  const marketService = createMarketDataService({
    prisma,
    config: options.config,
    logger: options.logger,
  });

  return {
    authService,
    marketService,
    readiness: createReadinessCheck({ prisma, redisUrl: options.redisUrl }),
    close: async () => {
      await prisma.$disconnect();
    },
  };
}
