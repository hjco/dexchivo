import { candleSchema, instrumentSchema, type Candle, type Instrument } from '@chivo/contracts';
import type { Timeframe } from '@chivo/contracts';

import type { BinanceExchangeInfo, BinanceKline, BinanceKlineEvent } from './binance-schemas';
import { MarketDataError } from './types';

const BINANCE_EXCHANGE = 'BINANCE';
const BINANCE_MARKET_SEGMENT = 'USD-M';

function requiredFilterValue(
  symbol: string,
  filters: { filterType: string; tickSize?: string | undefined; stepSize?: string | undefined }[],
  filterType: 'PRICE_FILTER' | 'LOT_SIZE',
  field: 'tickSize' | 'stepSize',
): string {
  const filter = filters.find((candidate) => candidate.filterType === filterType);
  const value = filter?.[field];
  if (!value) {
    throw new MarketDataError(
      'INVALID_EXCHANGE_RESPONSE',
      `Binance symbol ${symbol} is missing ${filterType}.${field}`,
      502,
    );
  }
  return value;
}

export function normalizeBinanceInstrument(
  symbol: BinanceExchangeInfo['symbols'][number],
): Instrument {
  const tickSize = requiredFilterValue(symbol.symbol, symbol.filters, 'PRICE_FILTER', 'tickSize');
  const stepSize = requiredFilterValue(symbol.symbol, symbol.filters, 'LOT_SIZE', 'stepSize');
  const minNotionalFilter = symbol.filters.find(
    (filter) => filter.filterType === 'MIN_NOTIONAL' || filter.filterType === 'NOTIONAL',
  );
  const minNotional = minNotionalFilter?.minNotional ?? minNotionalFilter?.notional;

  return instrumentSchema.parse({
    instrumentId: `${BINANCE_EXCHANGE}:${BINANCE_MARKET_SEGMENT}:${symbol.symbol}`,
    exchange: 'BINANCE',
    marketType: 'PERPETUAL',
    venueSymbol: symbol.symbol,
    baseAsset: symbol.baseAsset,
    quoteAsset: symbol.quoteAsset,
    ...(symbol.marginAsset ? { settleAsset: symbol.marginAsset } : {}),
    status: symbol.status === 'TRADING' ? 'TRADING' : 'HALTED',
    tickSize,
    stepSize,
    ...(minNotional ? { minNotional } : {}),
    contractMultiplier: '1',
    quantityUnit: 'BASE',
    pricePrecision: symbol.pricePrecision,
    quantityPrecision: symbol.quantityPrecision,
    capabilities: {
      orderTypes: ['MARKET', 'LIMIT', 'STOP_MARKET', 'TAKE_PROFIT_MARKET'],
      timeInForce: ['GTC', 'IOC', 'FOK'],
      positionMode: 'UNKNOWN',
      marginModes: ['ISOLATED', 'CROSS'],
      supportsReduceOnly: true,
      supportsStopOrders: true,
      supportsPartialFills: true,
    },
  });
}

export function normalizeBinanceInstruments(
  info: BinanceExchangeInfo,
  configuredSymbols: string[],
): Instrument[] {
  const configured = new Set(configuredSymbols.map((symbol) => symbol.toUpperCase()));
  const instruments: Instrument[] = [];

  for (const symbol of info.symbols) {
    if (!configured.has(symbol.symbol) || symbol.contractType !== 'PERPETUAL') {
      continue;
    }
    instruments.push(normalizeBinanceInstrument(symbol));
  }

  return instruments;
}

interface CandleFields {
  instrumentId: string;
  timeframe: Timeframe;
  openTime: number;
  closeTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

function buildCandle(fields: CandleFields, now: Date, closedOverride?: boolean): Candle {
  const closeTime = new Date(fields.closeTime);

  return candleSchema.parse({
    instrumentId: fields.instrumentId,
    timeframe: fields.timeframe,
    openTime: new Date(fields.openTime).toISOString(),
    closeTime: closeTime.toISOString(),
    open: fields.open,
    high: fields.high,
    low: fields.low,
    close: fields.close,
    volume: fields.volume,
    isClosed: closedOverride ?? closeTime.getTime() <= now.getTime(),
  });
}

export function normalizeBinanceKline(
  instrumentId: string,
  timeframe: Timeframe,
  kline: BinanceKline,
  now: Date = new Date(),
): Candle {
  return buildCandle(
    {
      instrumentId,
      timeframe,
      openTime: kline[0],
      closeTime: kline[6],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
    },
    now,
  );
}

export function normalizeBinanceKlineEvent(
  instrumentId: string,
  timeframe: Timeframe,
  event: BinanceKlineEvent,
  now: Date = new Date(),
): Candle {
  return buildCandle(
    {
      instrumentId,
      timeframe,
      openTime: event.k.t,
      closeTime: event.k.T,
      open: event.k.o,
      high: event.k.h,
      low: event.k.l,
      close: event.k.c,
      volume: event.k.v,
    },
    now,
    event.k.x,
  );
}
