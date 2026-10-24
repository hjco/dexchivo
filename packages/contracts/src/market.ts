import { z } from 'zod';

import {
  exchangeSchema,
  instrumentIdSchema,
  instrumentStatusSchema,
  marginModeSchema,
  marketTypeSchema,
  orderTypeSchema,
  positionModeSchema,
  quantityUnitSchema,
  timeframeSchema,
  timeInForceSchema,
  utcDateTimeSchema,
} from './common';
import {
  compareDecimalStrings,
  DECIMAL_STRING_PATTERN,
  isNonNegativeDecimalString,
  isPositiveDecimalString,
} from './decimal';

export const decimalStringSchema = z
  .string()
  .regex(
    DECIMAL_STRING_PATTERN,
    'expected a base-10 decimal string without exponent notation or leading zeros',
  );

export const positiveDecimalStringSchema = decimalStringSchema.refine(
  isPositiveDecimalString,
  'expected a positive decimal string',
);

export const nonNegativeDecimalStringSchema = decimalStringSchema.refine(
  isNonNegativeDecimalString,
  'expected a non-negative decimal string',
);

export const instrumentCapabilitiesSchema = z.strictObject({
  orderTypes: z.array(orderTypeSchema).min(1),
  timeInForce: z.array(timeInForceSchema),
  positionMode: positionModeSchema,
  marginModes: z.array(marginModeSchema).min(1),
  supportsReduceOnly: z.boolean(),
  supportsStopOrders: z.boolean(),
  supportsPartialFills: z.boolean(),
});

export const instrumentSchema = z.strictObject({
  instrumentId: instrumentIdSchema,
  exchange: exchangeSchema,
  marketType: marketTypeSchema,
  venueSymbol: z.string().min(1).max(64),
  baseAsset: z.string().min(1).max(32),
  quoteAsset: z.string().min(1).max(32),
  settleAsset: z.string().min(1).max(32).optional(),
  status: instrumentStatusSchema,
  tickSize: positiveDecimalStringSchema,
  stepSize: positiveDecimalStringSchema,
  minNotional: positiveDecimalStringSchema.optional(),
  contractMultiplier: positiveDecimalStringSchema,
  quantityUnit: quantityUnitSchema,
  pricePrecision: z.number().int().min(0).max(12),
  quantityPrecision: z.number().int().min(0).max(12),
  maxLeverage: positiveDecimalStringSchema.optional(),
  capabilities: instrumentCapabilitiesSchema,
});

export const candleSchema = z
  .strictObject({
    instrumentId: instrumentIdSchema,
    timeframe: timeframeSchema,
    openTime: utcDateTimeSchema,
    closeTime: utcDateTimeSchema,
    open: positiveDecimalStringSchema,
    high: positiveDecimalStringSchema,
    low: positiveDecimalStringSchema,
    close: positiveDecimalStringSchema,
    volume: nonNegativeDecimalStringSchema,
    isClosed: z.boolean(),
  })
  .superRefine((candle, ctx) => {
    if (compareDecimalStrings(candle.high, candle.low) < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'high must be greater than or equal to low',
        path: ['high'],
      });
    }
    if (compareDecimalStrings(candle.open, candle.high) > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'open must be less than or equal to high',
        path: ['open'],
      });
    }
    if (compareDecimalStrings(candle.open, candle.low) < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'open must be greater than or equal to low',
        path: ['open'],
      });
    }
    if (compareDecimalStrings(candle.close, candle.high) > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'close must be less than or equal to high',
        path: ['close'],
      });
    }
    if (compareDecimalStrings(candle.close, candle.low) < 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'close must be greater than or equal to low',
        path: ['close'],
      });
    }
    if (Date.parse(candle.closeTime) < Date.parse(candle.openTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'closeTime must not precede openTime',
        path: ['closeTime'],
      });
    }
  });

export const quoteSchema = z
  .strictObject({
    instrumentId: instrumentIdSchema,
    bidPrice: positiveDecimalStringSchema,
    askPrice: positiveDecimalStringSchema,
    bidSize: nonNegativeDecimalStringSchema,
    askSize: nonNegativeDecimalStringSchema,
    eventTime: utcDateTimeSchema,
  })
  .superRefine((quote, ctx) => {
    if (compareDecimalStrings(quote.bidPrice, quote.askPrice) > 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'bidPrice must not exceed askPrice',
        path: ['bidPrice'],
      });
    }
  });

export type Instrument = z.infer<typeof instrumentSchema>;
export type InstrumentCapabilities = z.infer<typeof instrumentCapabilitiesSchema>;
export type Candle = z.infer<typeof candleSchema>;
export type Quote = z.infer<typeof quoteSchema>;
