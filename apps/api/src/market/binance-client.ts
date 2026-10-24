import {
  binanceExchangeInfoSchema,
  binanceKlineEventSchema,
  binanceKlineSchema,
} from './binance-schemas';
import {
  MarketDataError,
  type MarketDataClient,
  type MarketStream,
  type OpenKlineStreamOptions,
  type KlineRequest,
} from './types';
import WebSocket from 'ws';

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;
const STREAM_IDLE_TIMEOUT_MS = 120_000;

export interface BinanceClientOptions {
  apiBaseUrl: string;
  wsBaseUrl: string;
  requestTimeoutMs: number;
}

function websocketUrl(baseUrl: string, symbol: string, interval: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${symbol.toLowerCase()}@kline_${interval}`;
}

export class BinanceMarketDataClient implements MarketDataClient {
  private readonly apiBaseUrl: string;
  private readonly wsBaseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(options: BinanceClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl;
    this.wsBaseUrl = options.wsBaseUrl;
    this.requestTimeoutMs = options.requestTimeoutMs;
  }

  async fetchExchangeInfo(
    signal?: AbortSignal,
  ): Promise<ReturnType<typeof binanceExchangeInfoSchema.parse>> {
    const payload = await this.fetchJson('/fapi/v1/exchangeInfo', undefined, signal);
    const parsed = binanceExchangeInfoSchema.safeParse(payload);
    if (!parsed.success) {
      throw new MarketDataError(
        'INVALID_EXCHANGE_RESPONSE',
        'Binance exchangeInfo response did not match the expected schema',
        502,
      );
    }
    return parsed.data;
  }

  async fetchKlines(
    request: KlineRequest,
    signal?: AbortSignal,
  ): Promise<ReturnType<typeof binanceKlineSchema.parse>[]> {
    const payload = await this.fetchJson(
      '/fapi/v1/klines',
      {
        symbol: request.symbol,
        interval: request.interval,
        limit: String(request.limit),
      },
      signal,
    );
    const parsed = binanceKlineSchema.array().safeParse(payload);
    if (!parsed.success) {
      throw new MarketDataError(
        'INVALID_EXCHANGE_RESPONSE',
        'Binance klines response did not match the expected schema',
        502,
      );
    }
    return parsed.data;
  }

  openKlineStream(options: OpenKlineStreamOptions): MarketStream {
    let socket: WebSocket | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const clearIdleTimer = (): void => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = undefined;
      }
    };

    const emitStatus = (
      state: 'connecting' | 'connected' | 'reconnecting',
      detail?: string,
    ): void => {
      options.onStatus(detail === undefined ? { state } : { state, detail: detail.slice(0, 200) });
    };

    const armIdleTimer = (): void => {
      clearIdleTimer();
      idleTimer = setTimeout(() => {
        if (!closed && socket) {
          emitStatus('reconnecting', 'No market data received; reconnecting');
          socket.terminate();
        }
      }, STREAM_IDLE_TIMEOUT_MS);
    };

    const scheduleReconnect = (): void => {
      if (closed || reconnectTimer) {
        return;
      }
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      attempt += 1;
      emitStatus('reconnecting', `Reconnecting in ${Math.ceil(delay / 1000)}s`);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        connect();
      }, delay);
    };

    const connect = (): void => {
      if (closed) {
        return;
      }

      emitStatus('connecting');
      const current = new WebSocket(
        websocketUrl(this.wsBaseUrl, options.symbol, options.interval),
        {
          handshakeTimeout: 10_000,
          perMessageDeflate: false,
        },
      );
      socket = current;

      current.on('open', () => {
        if (closed || socket !== current) {
          return;
        }
        attempt = 0;
        emitStatus('connected');
        armIdleTimer();
      });

      current.on('message', (data) => {
        if (closed || socket !== current) {
          return;
        }
        armIdleTimer();

        let payload: unknown;
        try {
          payload = JSON.parse(data.toString());
        } catch {
          return;
        }

        const parsed = binanceKlineEventSchema.safeParse(payload);
        if (!parsed.success || parsed.data.s !== options.symbol) {
          return;
        }
        options.onKline(parsed.data);
      });

      current.on('error', (error) => {
        if (!closed) {
          options.onError(error instanceof Error ? error : new Error('Binance stream error'));
        }
      });

      current.on('close', () => {
        if (socket === current) {
          socket = null;
        }
        clearIdleTimer();
        if (!closed) {
          scheduleReconnect();
        }
      });
    };

    connect();

    return {
      close: () => {
        closed = true;
        clearIdleTimer();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = undefined;
        }
        const current = socket;
        socket = null;
        if (current) {
          current.removeAllListeners();
          if (
            current.readyState === WebSocket.OPEN ||
            current.readyState === WebSocket.CONNECTING
          ) {
            current.close(1000, 'client closed');
          }
        }
      },
    };
  }

  private async fetchJson(
    path: string,
    query: Record<string, string> | undefined,
    signal: AbortSignal | undefined,
  ): Promise<unknown> {
    const url = new URL(path, this.apiBaseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const timeout = AbortSignal.timeout(this.requestTimeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: combinedSignal,
      });
    } catch (error) {
      throw new MarketDataError(
        'EXCHANGE_UNAVAILABLE',
        error instanceof Error && error.name === 'TimeoutError'
          ? 'Binance request timed out'
          : 'Binance public API is unavailable',
        502,
      );
    }

    if (!response.ok) {
      throw new MarketDataError(
        'EXCHANGE_ERROR',
        `Binance public API returned HTTP ${response.status}`,
        502,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new MarketDataError(
        'INVALID_EXCHANGE_RESPONSE',
        'Binance public API returned invalid JSON',
        502,
      );
    }
  }
}
