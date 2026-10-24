import { z } from 'zod';

import {
  controlModeSchema,
  executionModeSchema,
  instrumentIdSchema,
  semverSchema,
  timeframeSchema,
  utcDateTimeSchema,
} from './common';
import { candleSchema, instrumentSchema } from './market';

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().min(1).max(80),
    message: z.string().min(1).max(500),
    requestId: z.string().min(1).max(128).optional(),
    retryAfterSeconds: z.number().int().min(0).optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const healthStatusSchema = z.enum(['ok', 'degraded', 'error']);

export const healthCheckSchema = z.strictObject({
  name: z.string().min(1).max(64),
  status: healthStatusSchema,
  detail: z.string().max(500).optional(),
});

export const healthResponseSchema = z.strictObject({
  status: healthStatusSchema,
  service: z.string().min(1).max(64),
  version: semverSchema,
  checkedAt: utcDateTimeSchema,
  checks: z.array(healthCheckSchema),
});

export const systemInfoSchema = z.strictObject({
  service: z.literal('chivo-api'),
  version: semverSchema,
  executionMode: executionModeSchema,
  liveTradingEnabled: z.literal(false),
  controlModes: z.array(controlModeSchema),
  role: z.literal('ORCHESTRATION_AND_API'),
  limitations: z.array(z.string().min(1)).min(1),
});

export const authUserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().min(1).max(120),
  totpEnabled: z.boolean(),
  createdAt: utcDateTimeSchema,
});

export const loginRequestSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(1).max(256),
  totpCode: z
    .string()
    .regex(/^\d{6}$/, 'expected a six-digit authenticator code')
    .optional(),
});

export const loginResponseSchema = z.strictObject({
  user: authUserSchema,
  expiresAt: utcDateTimeSchema,
});

export const meResponseSchema = z.strictObject({
  user: authUserSchema,
  twoFactorAvailable: z.boolean(),
});

export const twoFactorCodeRequestSchema = z.strictObject({
  code: z.string().regex(/^\d{6}$/, 'expected a six-digit authenticator code'),
});

export const twoFactorSetupResponseSchema = z.strictObject({
  secret: z.string().min(16),
  otpauthUrl: z.url(),
});

export const twoFactorStatusResponseSchema = z.strictObject({
  enabled: z.boolean(),
});

export const marketListResponseSchema = z.strictObject({
  instruments: z.array(instrumentSchema).min(1),
  source: z.enum(['BINANCE', 'CACHE']),
  fetchedAt: utcDateTimeSchema,
});

export const candleListResponseSchema = z.strictObject({
  instrumentId: instrumentIdSchema,
  timeframe: timeframeSchema,
  candles: z.array(candleSchema),
  source: z.enum(['BINANCE', 'CACHE']),
  fetchedAt: utcDateTimeSchema,
});

export const candleStreamEventSchema = z.strictObject({
  candle: candleSchema,
  receivedAt: utcDateTimeSchema,
});

export const streamStatusSchema = z.enum(['connecting', 'connected', 'reconnecting', 'closed']);

export const streamStatusEventSchema = z.strictObject({
  status: streamStatusSchema,
  detail: z.string().max(200).optional(),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type SystemInfo = z.infer<typeof systemInfoSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type TwoFactorSetupResponse = z.infer<typeof twoFactorSetupResponseSchema>;
export type TwoFactorStatusResponse = z.infer<typeof twoFactorStatusResponseSchema>;
export type MarketListResponse = z.infer<typeof marketListResponseSchema>;
export type CandleListResponse = z.infer<typeof candleListResponseSchema>;
export type CandleStreamEvent = z.infer<typeof candleStreamEventSchema>;
export type StreamStatusEvent = z.infer<typeof streamStatusEventSchema>;
