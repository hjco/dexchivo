import { z } from 'zod';

import {
  exchangeSchema,
  instrumentIdSchema,
  semverSchema,
  signalSideSchema,
  timeframeSchema,
  utcDateTimeSchema,
} from './common';
import { compareDecimalStrings } from './decimal';
import { positiveDecimalStringSchema } from './market';

/**
 * A proposal produced by the Python engine. It is never an order and carries
 * no exchange credentials or execution permission.
 */
export const signalPayloadSchema = z
  .strictObject({
    strategyId: z.string().min(1).max(64),
    strategyVersion: semverSchema,
    exchange: exchangeSchema,
    instrumentId: instrumentIdSchema,
    timeframe: timeframeSchema,
    side: signalSideSchema,
    entryType: z.enum(['MARKET', 'LIMIT']),
    entryPrice: positiveDecimalStringSchema.optional(),
    stopLoss: positiveDecimalStringSchema,
    takeProfit: positiveDecimalStringSchema,
    candleClosedAt: utcDateTimeSchema,
    expiresAt: utcDateTimeSchema,
    confidence: z.number().min(0).max(1).optional(),
  })
  .superRefine((signal, ctx) => {
    if (Date.parse(signal.expiresAt) <= Date.parse(signal.candleClosedAt)) {
      ctx.addIssue({
        code: 'custom',
        message: 'expiresAt must be later than candleClosedAt',
        path: ['expiresAt'],
      });
    }

    if (signal.entryType === 'LIMIT' && signal.entryPrice === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'entryPrice is required for LIMIT signals',
        path: ['entryPrice'],
      });
    }

    if (signal.entryType === 'MARKET' && signal.entryPrice !== undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'entryPrice must be omitted for MARKET signals',
        path: ['entryPrice'],
      });
    }

    if (signal.entryPrice === undefined) {
      return;
    }

    const stopBelowEntry = compareDecimalStrings(signal.stopLoss, signal.entryPrice) < 0;
    const takeProfitAboveEntry = compareDecimalStrings(signal.takeProfit, signal.entryPrice) > 0;

    if (signal.side === 'LONG' && !(stopBelowEntry && takeProfitAboveEntry)) {
      ctx.addIssue({
        code: 'custom',
        message: 'LONG signals require stopLoss < entryPrice < takeProfit',
        path: ['stopLoss'],
      });
    }

    if (signal.side === 'SHORT' && (stopBelowEntry || takeProfitAboveEntry)) {
      ctx.addIssue({
        code: 'custom',
        message: 'SHORT signals require takeProfit < entryPrice < stopLoss',
        path: ['takeProfit'],
      });
    }
  });

export type SignalPayload = z.infer<typeof signalPayloadSchema>;
