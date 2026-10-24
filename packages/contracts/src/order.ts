import { z } from 'zod';

import {
  controlModeSchema,
  correlationIdSchema,
  executionModeSchema,
  instrumentIdSchema,
  orderSideSchema,
  orderTypeSchema,
  positionSideSchema,
  timeInForceSchema,
  utcDateTimeSchema,
} from './common';
import {
  decimalStringSchema,
  nonNegativeDecimalStringSchema,
  positiveDecimalStringSchema,
} from './market';

export const orderIntentStateSchema = z.enum([
  'CREATED',
  'RISK_APPROVED',
  'RISK_REJECTED',
  'SUBMISSION_PENDING',
  'SUBMITTED',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCEL_PENDING',
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'UNKNOWN_RECONCILE',
]);

export const orderIntentSchema = z
  .strictObject({
    intentId: z.uuid(),
    idempotencyKey: z.string().min(16).max(255),
    accountId: z.uuid(),
    correlationId: correlationIdSchema,
    executionMode: executionModeSchema,
    controlMode: controlModeSchema,
    instrumentId: instrumentIdSchema,
    side: orderSideSchema,
    positionSide: positionSideSchema,
    type: orderTypeSchema,
    timeInForce: timeInForceSchema.optional(),
    quantity: positiveDecimalStringSchema,
    limitPrice: positiveDecimalStringSchema.optional(),
    stopPrice: positiveDecimalStringSchema.optional(),
    stopLoss: positiveDecimalStringSchema.optional(),
    takeProfit: positiveDecimalStringSchema.optional(),
    reduceOnly: z.boolean(),
    state: orderIntentStateSchema,
    signalId: z.uuid().optional(),
    strategyId: z.string().min(1).max(64).optional(),
    createdAt: utcDateTimeSchema,
    updatedAt: utcDateTimeSchema,
  })
  .superRefine((intent, ctx) => {
    if (intent.type === 'LIMIT' && intent.limitPrice === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: 'limitPrice is required for LIMIT orders',
        path: ['limitPrice'],
      });
    }

    if (
      (intent.type === 'STOP_MARKET' || intent.type === 'TAKE_PROFIT_MARKET') &&
      intent.stopPrice === undefined
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'stopPrice is required for stop and take-profit orders',
        path: ['stopPrice'],
      });
    }

    if (Date.parse(intent.updatedAt) < Date.parse(intent.createdAt)) {
      ctx.addIssue({
        code: 'custom',
        message: 'updatedAt must not precede createdAt',
        path: ['updatedAt'],
      });
    }
  });

export const fillSchema = z.strictObject({
  fillId: z.uuid(),
  orderId: z.uuid(),
  venueFillId: z.string().min(1).max(128).optional(),
  instrumentId: instrumentIdSchema,
  executionMode: executionModeSchema,
  side: orderSideSchema,
  positionSide: positionSideSchema,
  price: positiveDecimalStringSchema,
  quantity: positiveDecimalStringSchema,
  fee: nonNegativeDecimalStringSchema,
  feeAsset: z.string().min(1).max(32),
  liquidity: z.enum(['MAKER', 'TAKER', 'UNKNOWN']),
  filledAt: utcDateTimeSchema,
});

export const positionSchema = z.strictObject({
  positionId: z.uuid(),
  accountId: z.uuid(),
  instrumentId: instrumentIdSchema,
  executionMode: executionModeSchema,
  side: z.enum(['LONG', 'SHORT']),
  quantity: nonNegativeDecimalStringSchema,
  entryPrice: nonNegativeDecimalStringSchema,
  markPrice: positiveDecimalStringSchema.optional(),
  unrealizedPnl: decimalStringSchema,
  realizedPnl: decimalStringSchema,
  leverage: positiveDecimalStringSchema,
  updatedAt: utcDateTimeSchema,
});

export type OrderIntent = z.infer<typeof orderIntentSchema>;
export type OrderIntentState = z.infer<typeof orderIntentStateSchema>;
export type Fill = z.infer<typeof fillSchema>;
export type Position = z.infer<typeof positionSchema>;

export const orderStatusSchema = z.enum([
  'NEW',
  'PARTIALLY_FILLED',
  'FILLED',
  'CANCELED',
  'REJECTED',
  'EXPIRED',
]);

export const orderSchema = z.strictObject({
  orderId: z.uuid(),
  intentId: z.uuid().optional(),
  accountId: z.uuid(),
  instrumentId: instrumentIdSchema,
  executionMode: executionModeSchema,
  controlMode: controlModeSchema,
  side: orderSideSchema,
  positionSide: positionSideSchema,
  type: orderTypeSchema,
  timeInForce: timeInForceSchema.optional(),
  quantity: positiveDecimalStringSchema,
  limitPrice: positiveDecimalStringSchema.optional(),
  stopPrice: positiveDecimalStringSchema.optional(),
  filledQuantity: nonNegativeDecimalStringSchema,
  remainingQuantity: nonNegativeDecimalStringSchema,
  avgFillPrice: decimalStringSchema.optional(),
  status: orderStatusSchema,
  reduceOnly: z.boolean(),
  clientOrderId: z.string().min(1).max(128).optional(),
  venueOrderId: z.string().min(1).max(128).optional(),
  rejectReason: z.string().max(255).optional(),
  createdAt: utcDateTimeSchema,
  updatedAt: utcDateTimeSchema,
});

export const ledgerEntryTypeSchema = z.enum([
  'CASH_DEPOSIT',
  'CASH_WITHDRAWAL',
  'COMMISSION',
  'REALIZED_PNL',
  'FUNDING',
  'ADJUSTMENT',
]);

export const ledgerEntrySchema = z.strictObject({
  entryId: z.uuid(),
  accountId: z.uuid(),
  type: ledgerEntryTypeSchema,
  asset: z.string().min(1).max(16),
  amount: decimalStringSchema,
  balanceAfter: decimalStringSchema,
  referenceType: z.string().min(1).max(32).optional(),
  referenceId: z.string().min(1).max(128).optional(),
  occurredAt: utcDateTimeSchema,
});

export const paperAccountSchema = z.strictObject({
  accountId: z.uuid(),
  executionMode: z.literal('PAPER'),
  baseCurrency: z.literal('USDT'),
  cashBalance: nonNegativeDecimalStringSchema,
  marginUsed: nonNegativeDecimalStringSchema,
  unrealizedPnl: decimalStringSchema,
  realizedPnl: decimalStringSchema,
  equity: nonNegativeDecimalStringSchema,
  updatedAt: utcDateTimeSchema,
});

export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type LedgerEntryType = z.infer<typeof ledgerEntryTypeSchema>;
export type PaperAccount = z.infer<typeof paperAccountSchema>;
