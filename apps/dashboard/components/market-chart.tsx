'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, Instrument, Timeframe } from '@chivo/contracts';
import { candleStreamEventSchema } from '@chivo/contracts';

import { candleToChartPoint, formatCandleTime, formatSource } from '@/lib/chart-data';
import { getPublicApiBaseUrl } from '@/lib/public-api';

interface MarketChartProps {
  instruments: Instrument[];
  initialInstrumentId: string;
  initialTimeframe: Timeframe;
  initialCandles: Candle[];
  source: 'BINANCE' | 'CACHE';
  fetchedAt: string | null;
}

export function MarketChart({
  instruments,
  initialInstrumentId,
  initialTimeframe,
  initialCandles,
  source,
  fetchedAt,
}: MarketChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [instrumentId, setInstrumentId] = useState(initialInstrumentId);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [sourceState, setSourceState] = useState(source);
  const [fetchedAtState, setFetchedAtState] = useState(fetchedAt);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>('conectando');
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const chart = createChart(container, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#cbd5e1',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.18)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.18)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(148, 163, 184, 0.4)' },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.4)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: 420,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#34d399',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#34d399',
      wickDownColor: '#f87171',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        chart.applyOptions({ width });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) {
      return;
    }
    series.setData(
      candles.map((candle) => {
        const point = candleToChartPoint(candle);
        return { ...point, time: point.time as UTCTimestamp };
      }),
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    let aborted = false;
    let source: EventSource | null = null;

    const connect = async () => {
      try {
        setStreamStatus('conectando');
        const url = new URL('/api/v1/market/stream', getPublicApiBaseUrl());
        url.searchParams.set('instrumentId', instrumentId);
        url.searchParams.set('timeframe', timeframe);
        source = new EventSource(url.toString(), { withCredentials: true });

        source.addEventListener('status', (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data);
            if (payload?.status === 'connected') {
              setStreamStatus('conectado');
              return;
            }
            if (payload?.status === 'reconnecting') {
              setStreamStatus('reconectando');
              return;
            }
            if (payload?.status === 'closed') {
              setStreamStatus('cerrado');
            }
          } catch {
            // ignore
          }
        });

        source.addEventListener('candle', (event) => {
          try {
            const payload = JSON.parse((event as MessageEvent).data);
            const parsed = candleStreamEventSchema.safeParse(payload);
            if (!parsed.success) {
              return;
            }
            const candle = parsed.data.candle;
            setCandles((current) => {
              const exists = current.find((existing) => existing.openTime === candle.openTime);
              if (exists) {
                return current.map((existing) =>
                  existing.openTime === candle.openTime ? candle : existing,
                );
              }
              const next = [...current, candle].slice(-500);
              return next;
            });
            setLastUpdate(new Date().toISOString());
            setSourceState('BINANCE');
          } catch {
            // ignore
          }
        });

        source.onerror = () => {
          if (!aborted) {
            setStreamStatus('sin conexión');
          }
        };
      } catch {
        if (!aborted) {
          setStreamStatus('sin conexión');
        }
      }
    };

    connect();

    return () => {
      aborted = true;
      source?.close();
    };
  }, [instrumentId, timeframe]);

  const changeInstrument = async (nextInstrumentId: string) => {
    setStatus('loading');
    setError(null);
    try {
      const url = new URL('/api/v1/candles', getPublicApiBaseUrl());
      url.searchParams.set('instrumentId', nextInstrumentId);
      url.searchParams.set('timeframe', timeframe);
      url.searchParams.set('limit', '300');
      const response = await fetch(url.toString(), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        setError('No se pudieron cargar las velas.');
        setStatus('error');
        return;
      }
      const payload = await response.json();
      setCandles(payload.candles ?? []);
      setSourceState(payload.source);
      setFetchedAtState(payload.fetchedAt);
      setInstrumentId(nextInstrumentId);
      setStatus('ready');
      setLastUpdate(new Date().toISOString());
    } catch {
      setError('No se pudieron cargar las velas.');
      setStatus('error');
    }
  };

  const changeTimeframe = async (nextTimeframe: Timeframe) => {
    setStatus('loading');
    setError(null);
    try {
      const url = new URL('/api/v1/candles', getPublicApiBaseUrl());
      url.searchParams.set('instrumentId', instrumentId);
      url.searchParams.set('timeframe', nextTimeframe);
      url.searchParams.set('limit', '300');
      const response = await fetch(url.toString(), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        setError('No se pudieron cargar las velas.');
        setStatus('error');
        return;
      }
      const payload = await response.json();
      setCandles(payload.candles ?? []);
      setSourceState(payload.source);
      setFetchedAtState(payload.fetchedAt);
      setTimeframe(nextTimeframe);
      setStatus('ready');
      setLastUpdate(new Date().toISOString());
    } catch {
      setError('No se pudieron cargar las velas.');
      setStatus('error');
    }
  };

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  const currentSource = sourceState;
  const currentFetched = fetchedAtState;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
      <header className="flex flex-col gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Mercado en tiempo real
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Binance USD-M · {formatSource(currentSource)}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {currentFetched
              ? `Última actualización: ${formatCandleTime(currentFetched)}`
              : 'Sin marca temporal'}
            {lastUpdate ? ` · Cliente: ${formatCandleTime(lastUpdate)}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={instrumentId}
            onChange={(event) => void changeInstrument(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-200"
          >
            {instruments.map((instrument) => (
              <option key={instrument.instrumentId} value={instrument.instrumentId}>
                {instrument.venueSymbol}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-700 p-1">
            {timeframes.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void changeTimeframe(value)}
                className={
                  value === timeframe
                    ? 'rounded-md bg-emerald-400/20 px-2 py-1 text-xs font-semibold text-emerald-200'
                    : 'rounded-md px-2 py-1 text-xs text-slate-300 hover:text-white'
                }
              >
                {value}
              </button>
            ))}
          </div>
          <span className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400">
            SSE: {streamStatus}
          </span>
        </div>
      </header>
      <div className="relative">
        {status === 'loading' ? (
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
            Cargando velas...
          </div>
        ) : null}
        {error ? (
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
            {error}
          </div>
        ) : null}
        <div ref={containerRef} className="h-[420px] w-full" />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-5 py-3 text-xs text-slate-500">
        <p>
          Los valores son decimal strings en el API y se convierten a número solo para el gráfico.
        </p>
        <p>{candles.length} velas mostradas</p>
      </footer>
    </section>
  );
}
