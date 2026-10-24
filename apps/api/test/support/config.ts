import type { AppConfig } from '../../src/config';

export function testConfig(): AppConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    nodeEnv: 'test',
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    redisUrl: 'redis://localhost:6379',
    authEncryptionKey: Buffer.alloc(32, 7).toString('base64'),
    rateLimitMax: 100,
    rateLimitTimeWindow: '1 minute',
    logLevel: 'silent',
    version: '0.0.0',
    dashboardOrigin: 'http://localhost:3000',
    trustProxy: false,
    executionMode: 'PAPER',
    liveTradingEnabled: false,
    sessionCookieSecure: false,
    sessionTtlMs: 3600000,
    auth: {
      maxAttempts: 5,
      windowMs: 60000,
      lockMs: 300000,
    },
  } as unknown as AppConfig;
}
