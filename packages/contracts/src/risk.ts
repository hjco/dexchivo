import { z } from 'zod';

export const RiskLimitsSchema = z.object({
  maxOrderNotionalUsd: z.string(),
  maxDailyNotionalUsd: z.string(),
  maxOpenPositions: z.number().int(),
  maxLeverage: z.number().int(),
  allowedSides: z.array(z.string()),
  allowedOrderTypes: z.array(z.string()),
});

export const RiskProfileSchema = z.object({
  profileId: z.string(),
  name: z.string(),
  executionMode: z.enum(['PAPER', 'LIVE']),
  limits: RiskLimitsSchema,
  enabled: z.boolean(),
});

export const RiskCheckResultSchema = z.object({
  approved: z.boolean(),
  reasons: z.array(z.string()),
  profileId: z.string(),
  limits: RiskLimitsSchema.optional(),
});

export type RiskLimits = z.infer<typeof RiskLimitsSchema>;
export type RiskProfile = z.infer<typeof RiskProfileSchema>;
export type RiskCheckResult = z.infer<typeof RiskCheckResultSchema>;
