import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  candleSchema,
  compareDecimalStrings,
  isDecimalString,
  isPositiveDecimalString,
  orderIntentSchema,
  quoteSchema,
  signalCreatedEventSchema,
  systemInfoSchema,
  typedEventSchema,
} from '../src/index';

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/signal-created-event.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

const validIntent = {
  intentId: 'd1b6f3f7-2b87-4b27-a7d8-7d4efbd3c101',
  idempotencyKey: 'paper:manual:btcusdt:2026-10-22T12:00:00Z:entry',
  accountId: 'b5ef7b4c-4bf8-4d15-bf8f-9f0f9f6f7a02',
  correlationId: '9a4f2c70-2f2a-4e8b-a5c8-3b7f8f0d2b02',
  executionMode: 'PAPER',
  controlMode: 'MANUAL',
  instrumentId: 'BINANCE:USD-M:BTCUSDT',
  side: 'BUY',
  positionSide: 'LONG',
  type: 'MARKET',
  quantity: '0.01',
  reduceOnly: false,
  state: 'CREATED',
  createdAt: '2026-10-22T12:00:05Z',
  updatedAt: '2026-10-22T12:00:05Z',
};

describe('decimal safety', () => {
  it('accepts base-10 strings and rejects float-like values', () => {
    expect(isDecimalString('0')).toBe(true);
    expect(isDecimalString('-10.500')).toBe(true);
    expect(isDecimalString('1e-8')).toBe(false);
    expect(isDecimalString('01.5')).toBe(false);
    expect(isDecimalString('.5')).toBe(false);
    expect(isDecimalString(0.5)).toBe(false);
    expect(isPositiveDecimalString('0.0001')).toBe(true);
    expect(isPositiveDecimalString('0.0000')).toBe(false);
    expect(isPositiveDecimalString('-1')).toBe(false);
  });

  it('compares without floating point conversion', () => {
    expect(compareDecimalStrings('0.1', '0.10')).toBe(0);
    expect(compareDecimalStrings('10000000000000000.01', '10000000000000000.02')).toBe(-1);
    expect(compareDecimalStrings('-5', '-10')).toBe(1);
    expect(compareDecimalStrings('0', '-0')).toBe(0);
    expect(compareDecimalStrings('9007199254740993', '9007199254740992')).toBe(1);
  });
});

describe('event contracts', () => {
  it('validates the shared signal fixture and preserves decimal strings', () => {
    const event = signalCreatedEventSchema.parse(fixture);

    expect(event.eventType).toBe('strategy.signal.created');
    expect(event.payload.stopLoss).toBe('67900.0');
    expect(typeof event.payload.takeProfit).toBe('string');
  });

  it('accepts the fixture through the typed event union', () => {
    expect(typedEventSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects numeric financial values and non-UTC timestamps', () => {
    const numericStop = {
      ...fixture,
      payload: { ...(fixture.payload as object), stopLoss: 67900 },
    };
    const offsetTime = { ...fixture, occurredAt: '2026-10-22T12:00:05+00:00' };
    const unknownType = { ...fixture, eventType: 'strategy.signal.unknown' };

    expect(signalCreatedEventSchema.safeParse(numericStop).success).toBe(false);
    expect(signalCreatedEventSchema.safeParse(offsetTime).success).toBe(false);
    expect(signalCreatedEventSchema.safeParse(unknownType).success).toBe(false);
  });

  it('requires expiry after candle close', () => {
    const invalid = {
      ...fixture,
      payload: {
        ...(fixture.payload as object),
        expiresAt: '2026-10-22T11:59:59Z',
      },
    };

    expect(signalCreatedEventSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('order contracts', () => {
  it('validates a paper order intent', () => {
    expect(orderIntentSchema.parse(validIntent).executionMode).toBe('PAPER');
  });

  it('requires a limit price and rejects invalid quantities', () => {
    const missingPrice = { ...validIntent, type: 'LIMIT' };
    const floatQuantity = { ...validIntent, quantity: 0.01 };

    expect(orderIntentSchema.safeParse(missingPrice).success).toBe(false);
    expect(orderIntentSchema.safeParse(floatQuantity).success).toBe(false);
  });

  it('rejects timestamps that move backwards', () => {
    const invalid = { ...validIntent, updatedAt: '2026-10-22T11:59:59Z' };

    expect(orderIntentSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('market contracts', () => {
  it('rejects an inverted quote and inconsistent candles', () => {
    const quote = {
      instrumentId: 'BINANCE:USD-M:BTCUSDT',
      bidPrice: '100.1',
      askPrice: '100.0',
      bidSize: '1',
      askSize: '1',
      eventTime: '2026-10-22T12:00:00Z',
    };
    const candle = {
      instrumentId: 'BINANCE:USD-M:BTCUSDT',
      timeframe: '15m',
      openTime: '2026-10-22T12:00:00Z',
      closeTime: '2026-10-22T12:15:00Z',
      open: '100',
      high: '99',
      low: '98',
      close: '99',
      volume: '42.5',
      isClosed: true,
    };

    expect(quoteSchema.safeParse(quote).success).toBe(false);
    expect(candleSchema.safeParse(candle).success).toBe(false);
  });
});

describe('API contracts', () => {
  it('pins M0 to PAPER and LIVE disabled', () => {
    const info = systemInfoSchema.parse({
      service: 'chivo-api',
      version: '0.1.0',
      executionMode: 'PAPER',
      liveTradingEnabled: false,
      controlModes: ['MANUAL', 'AUTO'],
      role: 'ORCHESTRATION_AND_API',
      limitations: ['M0 scaffold only'],
    });

    expect(info.executionMode).toBe('PAPER');
    expect(systemInfoSchema.safeParse({ ...info, liveTradingEnabled: true }).success).toBe(false);
  });
});
