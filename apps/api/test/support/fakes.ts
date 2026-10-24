import type { AppInstance } from '../../src/app';
import { buildApp } from '../../src/app';
import type { AppServices } from '../../src/services';
import { testConfig } from './config';
import { InMemoryAuthStore } from '../../src/auth/in-memory-auth-store';
import { createTestAuthService, testUser } from './auth';
import { MarketDataService } from '../../src/market/market-service';
import { FakeMarketDataClient } from './market-client';
import { InMemoryMarketRepository } from '../../src/market/repository';

export { testConfig } from './config';
export { InMemoryAuthStore } from '../../src/auth/in-memory-auth-store';
export { createTestAuthService, testUser, TEST_EMAIL, TEST_PASSWORD, TEST_USER_ID } from './auth';
export { FakeMarketDataClient } from './market-client';
export { InMemoryMarketRepository };

export interface TestAppOptions {
  config?: ReturnType<typeof testConfig>;
  authService?: AppServices['authService'];
  marketService?: AppServices['marketService'];
  readiness?: AppServices['readiness'];
}

export function createTestServices(options: TestAppOptions = {}): AppServices {
  const authService =
    options.authService ??
    createTestAuthService(new InMemoryAuthStore([testUser({} as any)]));
  const marketService =
    options.marketService ??
    new MarketDataService({
      client: new FakeMarketDataClient(),
      repository: new InMemoryMarketRepository(),
      symbols: ['BTCUSDT', 'ETHUSDT'],
      syncTtlMs: 300_000,
    });

  return {
    authService,
    marketService,
    readiness:
      options.readiness ??
      (async () => [
        { name: 'database', status: 'ok', detail: 'test database' },
        { name: 'redis', status: 'ok', detail: 'test redis' },
      ]),
    close: async () => undefined,
  };
}

export async function createTestApp(options: TestAppOptions = {}): Promise<AppInstance> {
  const config = options.config ?? testConfig();
  const app = await buildApp({
    config,
    services: createTestServices({ ...options, config }),
    logger: false,
  });
  await app.ready();
  return app;
}

export const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
