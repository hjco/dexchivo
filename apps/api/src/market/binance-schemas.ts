import { z } from 'zod';

/**
 * Minimal USD-M Futures schemas. Unknown fields are stripped; every field the
 * normalizer depends on is required so a Binance contract change fails loudly
 * instead of producing silently invalid instruments.
 */
export const binanceFilterSchema = z.object({
  filterType: z.string().min(1),
  tickSize: z.string().optional(),
  stepSize: z.string().optional(),
  minNotional: z.string().optional(),
  notional: z.string().optional(),
});

export const binanceSymbolSchema = z.object({
  symbol: z.string().min(1),
  contractType: z.string().min(1),
  status: z.string().min(1),
  baseAsset: z.string().min(1),
  quoteAsset: z.string().min(1),
  marginAsset: z.string().optional(),
  pricePrecision: z.number().int().min(0),
  quantityPrecision: z.number().int().min(0),
  filters: z.array(binanceFilterSchema),
});

export const binanceExchangeInfoSchema = z.object({
  timezone: z.string().optional(),
  serverTime: z.number().int().optional(),
  symbols: z.array(binanceSymbolSchema),
});

export const binanceKlineSchema = z.tuple([
  z.number().int(),
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.number().int(),
  z.string(),
  z.number().int(),
  z.string(),
  z.string(),
  z.string(),
]);

export const binanceKlineEventSchema = z.object({
  e: z.literal('kline'),
  E: z.number().int(),
  s: z.string().min(1),
  k: z.object({
    t: z.number().int(),
    T: z.number().int(),
    s: z.string().min(1),
    i: z.string().min(1),
    o: z.string(),
    c: z.string(),
    h: z.string(),
    l: z.string(),
    v: z.string(),
    x: z.boolean(),
  }),
});

export type BinanceExchangeInfo = z.infer<typeof binanceExchangeInfoSchema>;
export type BinanceSymbol = z.infer<typeof binanceSymbolSchema>;
export type BinanceKline = z.infer<typeof binanceKlineSchema>;
export type BinanceKlineEvent = z.infer<typeof binanceKlineEventSchema>;
