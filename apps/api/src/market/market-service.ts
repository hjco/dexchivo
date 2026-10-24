import type {
  Candle,
  CandleListResponse,
  Instrument,
  MarketListResponse,
  Timeframe,
} from '@chivo/contracts';

import {
  normalizeBinanceInstruments,
  normalizeBinanceKline,
  normalizeBinanceKlineEvent,
} from './normalize';
import type { MarketRepository } from './repository';
import {
  MarketDataError,
  type MarketDataClient,
  type MarketStream,
  type MarketStreamStatus,
} from './types';

export interface MarketStreamHandlers {
  onCandle: (candle: Candle) => void;
  onStatus: (status: MarketStreamStatus) => void;
  onError: (error: Error) => void;
}

export interface MarketDataServiceOptions {
  client: MarketDataClient;
  repository: MarketRepository;
  symbols: string[];
  syncTtlMs: number;
  now?: () => Date;
  warn?: (message: string, fields: Record<string, unknown>) => void;
}

export class MarketDataService {
  private readonly client: MarketDataClient;
  private readonly repository: MarketRepository;
  private readonly symbols: string[];
  private readonly syncTtlMs: number;
  private readonly now: () => Date;
  private readonly warn: ((message: string, fields: Record<string, unknown>) => void) | undefined;
  private syncPromise: Promise<{ instruments: Instrument[]; fetchedAt: string }> | null = null;

  constructor(options: MarketDataServiceOptions) {
    this.client = options.client;
    this.repository = options.repository;
    this.symbols = options.symbols;
    this.syncTtlMs = options.syncTtlMs;
    this.now = options.now ?? (() => new Date());
    this.warn = options.warn;
  }

  async listInstruments(): Promise<MarketListResponse> {
    const cached = await this.repository.listInstruments();
    const now = this.now();
    const fresh =
      cached.instruments.length > 0 &&
      cached.fetchedAt !== null &&
      now.getTime() - Date.parse(cached.fetchedAt) < this.syncTtlMs;

    if (fresh) {
      return {
        instruments: cached.instruments,
        source: 'CACHE',
        fetchedAt: cached.fetchedAt as string,
      };
    }

    try {
      const snapshot = await this.fetchAndPersistInstruments();
      return {
        instruments: snapshot.instruments,
        source: 'BINANCE',
        fetchedAt: snapshot.fetchedAt,
      };
    } catch (error) {
      this.warn?.('market instrument sync failed; serving cache when available', {
        error: error instanceof Error ? error.name : 'unknown',
        cachedInstruments: cached.instruments.length,
      });

      if (cached.instruments.length > 0) {
        return {
          instruments: cached.instruments,
          source: 'CACHE',
          fetchedAt: cached.fetchedAt ?? now.toISOString(),
        };
      }

      throw this.asMarketDataError(error);
    }
  }

  async getCandles(
    instrumentId: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<CandleListResponse> {
    const instrument = await this.ensureInstrument(instrumentId);
    const now = this.now();

    let candles: Candle[];
    try {
      const klines = await this.client.fetchKlines({
        symbol: instrument.venueSymbol,
        interval: timeframe,
        limit,
      });
      candles = klines.map((kline) =>
        normalizeBinanceKline(instrument.instrumentId, timeframe, kline, now),
      );
      if (candles.length === 0) {
        throw new MarketDataError(
          'INVALID_EXCHANGE_RESPONSE',
          'Binance returned no candles for the requested market',
          502,
        );
      }
    } catch (error) {
      this.warn?.('candle fetch failed; serving cache when available', {
        instrumentId,
        timeframe,
        error: error instanceof Error ? error.name : 'unknown',
      });

      const cached = await this.repository.listCandles(instrumentId, timeframe, limit);
      if (cached.candles.length > 0) {
        return {
          instrumentId,
          timeframe,
          candles: cached.candles,
          source: 'CACHE',
          fetchedAt: cached.fetchedAt ?? now.toISOString(),
        };
      }
      throw this.asMarketDataError(error);
    }

    await this.repository.upsertCandles(candles);
    return {
      instrumentId,
      timeframe,
      candles,
      source: 'BINANCE',
      fetchedAt: now.toISOString(),
    };
  }

  async openStream(
    instrumentId: string,
    timeframe: Timeframe,
    handlers: MarketStreamHandlers,
  ): Promise<MarketStream> {
    const instrument = await this.ensureInstrument(instrumentId);

    return this.client.openKlineStream({
      symbol: instrument.venueSymbol,
      interval: timeframe,
      onKline: (event) => {
        try {
          handlers.onCandle(
            normalizeBinanceKlineEvent(instrument.instrumentId, timeframe, event, this.now()),
          );
        } catch (error) {
          handlers.onError(
            error instanceof Error ? error : new Error('Failed to normalize stream candle'),
          );
        }
      },
      onStatus: handlers.onStatus,
      onError: handlers.onError,
    });
  }

  private async ensureInstrument(instrumentId: string): Promise<Instrument> {
    const existing = await this.repository.findInstrument(instrumentId);
    if (existing && this.symbols.includes(existing.venueSymbol)) {
      return existing;
    }

    await this.listInstruments();
    const refreshed = await this.repository.findInstrument(instrumentId);
    if (!refreshed || !this.symbols.includes(refreshed.venueSymbol)) {
      throw new MarketDataError(
        'INSTRUMENT_NOT_FOUND',
        'The requested instrument is not configured for public market data',
        404,
      );
    }
    return refreshed;
  }

  private async fetchAndPersistInstruments(): Promise<{
    instruments: Instrument[];
    fetchedAt: string;
  }> {
    if (!this.syncPromise) {
      this.syncPromise = (async () => {
        const info = await this.client.fetchExchangeInfo();
        const instruments = normalizeBinanceInstruments(info, this.symbols);
        if (instruments.length === 0) {
          throw new MarketDataError(
            'INVALID_EXCHANGE_RESPONSE',
            'None of the configured symbols are available on Binance USD-M Futures',
            502,
          );
        }

        await this.repository.upsertInstruments(instruments);
        return { instruments, fetchedAt: this.now().toISOString() };
      })().finally(() => {
        this.syncPromise = null;
      });
    }

    return this.syncPromise;
  }

  private asMarketDataError(error: unknown): MarketDataError {
    if (error instanceof MarketDataError) {
      return error;
    }
    return new MarketDataError(
      'MARKET_DATA_UNAVAILABLE',
      'Public market data is currently unavailable',
      502,
    );
  }
}
