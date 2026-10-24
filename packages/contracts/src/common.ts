import { z } from 'zod';

export const CONTRACT_SCHEMA_VERSION = 1 as const;

export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'expected a semantic version such as 1.0.0');

export const producerSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9-]*$/, 'expected a lowercase producer identifier');

export const correlationIdSchema = z.uuid();

export const utcDateTimeSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => value.endsWith('Z'), 'timestamp must be expressed in UTC with a Z suffix');

export const exchangeSchema = z.enum(['BINANCE', 'HYPERLIQUID', 'ASTER']);
export const marketTypeSchema = z.enum(['USD_M_FUTURES', 'PERPETUAL', 'SPOT']);
export const quantityUnitSchema = z.enum(['BASE', 'CONTRACT']);
export const instrumentStatusSchema = z.enum(['TRADING', 'HALTED', 'UNKNOWN']);
export const positionModeSchema = z.enum(['ONE_WAY', 'HEDGE', 'UNKNOWN']);
export const marginModeSchema = z.enum(['ISOLATED', 'CROSS', 'UNKNOWN']);

export const timeframeSchema = z.enum(['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d']);

export const executionModeSchema = z.enum(['PAPER', 'LIVE']);
export const controlModeSchema = z.enum(['MANUAL', 'AUTO']);

export const signalSideSchema = z.enum(['LONG', 'SHORT']);
export const orderSideSchema = z.enum(['BUY', 'SELL']);
export const positionSideSchema = z.enum(['LONG', 'SHORT', 'BOTH']);

export const orderTypeSchema = z.enum(['MARKET', 'LIMIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET']);
export const timeInForceSchema = z.enum(['GTC', 'IOC', 'FOK']);

export const instrumentIdSchema = z
  .string()
  .min(5)
  .max(96)
  .regex(
    /^[A-Z][A-Z0-9-]*:[A-Z0-9-]+:[A-Z0-9._-]+$/,
    'expected a normalized instrument id such as BINANCE:USD-M:BTCUSDT',
  );

export const eventTypeSchema = z.enum([
  'market.candle.closed',
  'strategy.signal.created',
  'strategy.signal.expired',
  'risk.order.approved',
  'risk.order.rejected',
  'order.intent.created',
  'order.submitted',
  'order.partially_filled',
  'order.filled',
  'order.cancelled',
  'order.rejected',
  'position.updated',
  'bot.paused',
  'notification.created',
]);

export type Exchange = z.infer<typeof exchangeSchema>;
export type MarketType = z.infer<typeof marketTypeSchema>;
export type Timeframe = z.infer<typeof timeframeSchema>;
export type ExecutionMode = z.infer<typeof executionModeSchema>;
export type ControlMode = z.infer<typeof controlModeSchema>;
export type EventType = z.infer<typeof eventTypeSchema>;
