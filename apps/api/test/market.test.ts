import { describe, expect, it } from 'vitest';

import { binanceExchangeInfoSchema, binanceKlineSchema } from '../src/market/binance-schemas';
import {
  normalizeBinanceInstrument,
  normalizeBinanceInstruments,
  normalizeBinanceKline,
} from '../src/market/normalize';
import { MarketDataService } from '../src/market/market-service';
import { MarketDataError } from '../src/market/types';
import { FakeMarketDataClient, InMemoryMarketRepository } from './support/fakes';

const exchangeInfo = binanceExchangeInfoSchema.parse({
  timezone: 'UTC',
  symbols: [
    {
      symbol: 'BTCUSDT',
      contractType: 'PERPETUAL',
      status: 'TRADING',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      marginAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      filters: [
        { filterType: 'PRICE_FILTER', tickSize: '0.10' },
        { filterType: 'LOT_SIZE', stepSize: '0.001' },
        { filterType: 'MIN_NOTIONAL', notional: '5' },
      ],
    },
    {
      symbol: 'ETHUSDT',
      contractType: 'PERPETUAL',
      status: 'TRADING',
      baseAsset: 'ETH',
      quoteAsset: 'USDT',
      marginAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 3,
      filters: [
        { filterType: 'PRICE_FILTER', tickSize: '0.01' },
        { filterType: 'LOT_SIZE', stepSize: '0.001' },
      ],
    },
    {
      symbol: 'UNKNOWNUSDT',
      contractType: 'PERPETUAL',
      status: 'TRADING',
      baseAsset: 'UNKNOWN',
      quoteAsset: 'USDT',
      marginAsset: 'USDT',
      pricePrecision: 2,
      quantityPrecision: 2,
      filters: [
        { filterType: 'PRICE_FILTER', tickSize: '0.01' },
        { filterType: 'LOT_SIZE', stepSize: '1' },
      ],
    },
  ],
});

const btcOpenTime = Date.parse('2026-01-01T00:00:00.000Z');
const btcCloseTime = btcOpenTime + 59_999;

const btcKline = binanceKlineSchema.parse([
  btcOpenTime,
  '100.00',
  '110.00',
  '90.00',
  '105.00',
  '12.500',
  btcCloseTime,
  '1312.50',
  42,
  '6.250',
  '656.25',
  '0',
]);

const btcInstrument = normalizeBinanceInstrument(exchangeInfo.symbols[0]!);
const btcCandles = [
  normalizeBinanceKline(
    btcInstrument.instrumentId,
    '1m',
    btcKline,
    new Date('2026-01-01T00:00:00.000Z'),
  ),
];

describe('Binance normalization', () => {
  it('normalizes USD-M perpetual instruments with decimal strings', () => {
    const instrument = normalizeBinanceInstrument(exchangeInfo.symbols[0]!);

    expect(instrument).toMatchObject({
      instrumentId: 'BINANCE:USD-M:BTCUSDT',
      exchange: 'BINANCE',
      marketType: 'PERPETUAL',
      venueSymbol: 'BTCUSDT',
      status: 'TRADING',
      tickSize: '0.10',
      stepSize: '0.001',
      minNotional: '5',
      contractMultiplier: '1',
      quantityUnit: 'BASE',
    });
    expect(instrument.capabilities.supportsReduceOnly).toBe(true);
    expect(typeof instrument.tickSize).toBe('string');
  });

  it('filters to configured symbols only', () => {
    const instruments = normalizeBinanceInstruments(exchangeInfo, ['btcusdt', 'ETHUSDT']);

    expect(instruments.map((instrument) => instrument.venueSymbol)).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('rejects symbols missing required filters', () => {
    const broken = {
      ...exchangeInfo.symbols[0]!,
      filters: [{ filterType: 'PRICE_FILTER', tickSize: '0.10' }],
    };

    expect(() => normalizeBinanceInstrument(broken)).toThrow(MarketDataError);
    expect(() => normalizeBinanceInstrument(broken)).toThrow(/LOT_SIZE\.stepSize/);
  });

  it('normalizes REST candles and marks closed candles from the close time', () => {
    const beforeClose = normalizeBinanceKline(
      btcInstrument.instrumentId,
      '1m',
      btcKline,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const afterClose = normalizeBinanceKline(
      btcInstrument.instrumentId,
      '1m',
      btcKline,
      new Date('2026-01-01T01:00:00.000Z'),
    );

    expect(beforeClose).toMatchObject({
      open: '100.00',
      high: '110.00',
      low: '90.00',
      close: '105.00',
      volume: '12.500',
      isClosed: false,
    });
    expect(afterClose.isClosed).toBe(true);
  });
});

describe('market data service', () => {
  it('fetches, normalizes and persists instruments and candles', async () => {
    const repository = new InMemoryMarketRepository();
    const client = new FakeMarketDataClient({ exchangeInfo, klines: [btcKline] });
    const service = new MarketDataService({
      client,
      repository,
      symbols: ['BTCUSDT', 'ETHUSDT'],
      syncTtlMs: 300_000,
    });

    const markets = await service.listInstruments();
    expect(markets.source).toBe('BINANCE');
    expect(markets.instruments).toHaveLength(2);
    expect(repository.instruments.size).toBe(2);

    const candles = await service.getCandles('BINANCE:USD-M:BTCUSDT', '1m', 100);
    expect(candles.source).toBe('BINANCE');
    expect(candles.candles).toHaveLength(1);
    expect(candles.candles[0]?.instrumentId).toBe('BINANCE:USD-M:BTCUSDT');
    expect(repository.candles.size).toBe(1);
  });

  it('serves cached instruments when Binance is unavailable', async () => {
    const repository = new InMemoryMarketRepository([btcInstrument]);
    repository.fetchedAt = '2020-01-01T00:00:00.000Z';
    const service = new MarketDataService({
      client: new FakeMarketDataClient({ failExchangeInfo: true }),
      repository,
      symbols: ['BTCUSDT'],
      syncTtlMs: 300_000,
    });

    const result = await service.listInstruments();

    expect(result.source).toBe('CACHE');
    expect(result.instruments).toHaveLength(1);
    expect(result.fetchedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('serves cached candles when Binance is unavailable and labels the source', async () => {
    const repository = new InMemoryMarketRepository([btcInstrument], btcCandles);
    repository.fetchedAt = new Date().toISOString();
    const service = new MarketDataService({
      client: new FakeMarketDataClient({ failKlines: true }),
      repository,
      symbols: ['BTCUSDT'],
      syncTtlMs: 300_000,
    });

    const result = await service.getCandles('BINANCE:USD-M:BTCUSDT', '1m', 100);

    expect(result.source).toBe('CACHE');
    expect(result.candles).toHaveLength(1);
  });

  it('fails loudly when there is no cache to serve', async () => {
    const repository = new InMemoryMarketRepository([btcInstrument]);
    repository.fetchedAt = new Date().toISOString();
    const service = new MarketDataService({
      client: new FakeMarketDataClient({ failKlines: true }),
      repository,
      symbols: ['BTCUSDT'],
      syncTtlMs: 300_000,
    });

    await expect(service.getCandles('BINANCE:USD-M:BTCUSDT', '1m', 100)).rejects.toMatchObject({
      code: 'MARKET_DATA_UNAVAILABLE',
      statusCode: 502,
    });
  });

  it('rejects instruments that are not configured', async () => {
    const repository = new InMemoryMarketRepository([btcInstrument]);
    repository.fetchedAt = '2020-01-01T00:00:00.000Z';
    const service = new MarketDataService({
      client: new FakeMarketDataClient({ exchangeInfo, klines: [btcKline] }),
      repository,
      symbols: ['BTCUSDT'],
      syncTtlMs: 300_000,
    });

    await expect(
      service.getCandles('BINANCE:USD-M:NOTCONFIGURED', '1m', 100),
    ).rejects.toMatchObject({ code: 'INSTRUMENT_NOT_FOUND', statusCode: 404 });
  });
});
