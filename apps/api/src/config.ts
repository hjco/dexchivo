import { parseEncryptionKey } from '@chivo/security';
import { z } from 'zod';

const booleanStringSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const optionalBooleanStringSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_VERSION: z
      .string()
      .regex(/^\d+\.\d+\.\d+$/, 'APP_VERSION must be a semantic version')
      .default('0.1.0'),
    DASHBOARD_ORIGIN: z.string().url().default('http://localhost:3000'),
    TRUST_PROXY: booleanStringSchema,
    EXECUTION_MODE: z.enum(['PAPER', 'LIVE']).default('PAPER'),
    ENABLE_LIVE_TRADING: booleanStringSchema,

    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgresql://chivo:chivo_local_dev_only@localhost:5432/chivo?schema=public'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

    AUTH_ENCRYPTION_KEY: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    SESSION_COOKIE_SECURE: optionalBooleanStringSchema,
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
    LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
    AUTH_TOTP_ISSUER: z.string().min(1).max(64).default('Chivo'),

    BINANCE_FAPI_BASE_URL: z.string().url().default('https://fapi.binance.com'),
    BINANCE_FUTURES_WS_BASE_URL: z
      .string()
      .regex(/^wss?:\/\/[^\s]+$/, 'BINANCE_FUTURES_WS_BASE_URL must be a websocket URL')
      .default('wss://fstream.binance.com/ws'),
    BINANCE_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(8_000),
    MARKET_SYMBOLS: z.string().min(1).default('BTCUSDT,ETHUSDT,SOLUSDT'),
    MARKET_SYNC_TTL_SECONDS: z.coerce.number().int().min(10).max(86_400).default(300),
  })
  .superRefine((env, ctx) => {
    if (env.EXECUTION_MODE !== 'PAPER') {
      ctx.addIssue({
        code: 'custom',
        message: 'M1 supports PAPER execution only; LIVE cannot be enabled',
        path: ['EXECUTION_MODE'],
      });
    }

    if (env.ENABLE_LIVE_TRADING) {
      ctx.addIssue({
        code: 'custom',
        message: 'LIVE trading is not implemented; ENABLE_LIVE_TRADING must be false',
        path: ['ENABLE_LIVE_TRADING'],
      });
    }

    const symbols = env.MARKET_SYMBOLS.split(',').map((symbol) => symbol.trim().toUpperCase());
    if (symbols.some((symbol) => !/^[A-Z0-9]{2,24}$/.test(symbol))) {
      ctx.addIssue({
        code: 'custom',
        message: 'MARKET_SYMBOLS must be a comma-separated list of USD-M symbols',
        path: ['MARKET_SYMBOLS'],
      });
    }

    if (env.AUTH_ENCRYPTION_KEY) {
      try {
        parseEncryptionKey(env.AUTH_ENCRYPTION_KEY);
      } catch (error) {
        ctx.addIssue({
          code: 'custom',
          message: error instanceof Error ? error.message : 'invalid AUTH_ENCRYPTION_KEY',
          path: ['AUTH_ENCRYPTION_KEY'],
        });
      }
    } else if (env.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        message: 'AUTH_ENCRYPTION_KEY is required in production to protect 2FA secrets',
        path: ['AUTH_ENCRYPTION_KEY'],
      });
    }
  });

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  version: string;
  dashboardOrigin: string;
  trustProxy: boolean;
  executionMode: 'PAPER';
  liveTradingEnabled: false;
  databaseUrl: string;
  redisUrl: string;
  authEncryptionKey: string | undefined;
  sessionCookieSecure: boolean;
  sessionTtlMs: number;
  loginMaxAttempts: number;
  loginWindowMs: number;
  totpIssuer: string;
  binanceApiBaseUrl: string;
  binanceWsBaseUrl: string;
  binanceRequestTimeoutMs: number;
  marketSymbols: string[];
  marketSyncTtlMs: number;
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = envSchema.parse(source);
  const symbols = [
    ...new Set(env.MARKET_SYMBOLS.split(',').map((symbol) => symbol.trim().toUpperCase())),
  ];

  return {
    nodeEnv: env.NODE_ENV,
    host: env.API_HOST,
    port: env.API_PORT,
    logLevel: env.LOG_LEVEL,
    version: env.APP_VERSION,
    dashboardOrigin: env.DASHBOARD_ORIGIN,
    trustProxy: env.TRUST_PROXY,
    executionMode: 'PAPER',
    liveTradingEnabled: false,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    authEncryptionKey: env.AUTH_ENCRYPTION_KEY,
    sessionCookieSecure: env.SESSION_COOKIE_SECURE ?? env.NODE_ENV === 'production',
    sessionTtlMs: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
    loginMaxAttempts: env.LOGIN_MAX_ATTEMPTS,
    loginWindowMs: env.LOGIN_WINDOW_MINUTES * 60 * 1000,
    totpIssuer: env.AUTH_TOTP_ISSUER,
    binanceApiBaseUrl: env.BINANCE_FAPI_BASE_URL,
    binanceWsBaseUrl: env.BINANCE_FUTURES_WS_BASE_URL,
    binanceRequestTimeoutMs: env.BINANCE_REQUEST_TIMEOUT_MS,
    marketSymbols: symbols,
    marketSyncTtlMs: env.MARKET_SYNC_TTL_SECONDS * 1000,
  };
}
