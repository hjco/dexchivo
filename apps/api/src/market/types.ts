import type { Timeframe } from '@chivo/contracts';

import type { BinanceExchangeInfo, BinanceKline, BinanceKlineEvent } from './binance-schemas';

export interface KlineRequest {
  symbol: string;
  interval: Timeframe;
  limit: number;
}

export type MarketStreamState = 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface MarketStreamStatus {
  state: MarketStreamState;
  detail?: string;
}

export interface MarketStream {
  close(): void;
}

export interface OpenKlineStreamOptions {
  symbol: string;
  interval: Timeframe;
  onKline: (event: BinanceKlineEvent) => void;
  onStatus: (status: MarketStreamStatus) => void;
  onError: (error: Error) => void;
}

export interface MarketDataClient {
  fetchExchangeInfo(signal?: AbortSignal): Promise<BinanceExchangeInfo>;
  fetchKlines(request: KlineRequest, signal?: AbortSignal): Promise<BinanceKline[]>;
  openKlineStream(options: OpenKlineStreamOptions): MarketStream;
}

export class MarketDataError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}
