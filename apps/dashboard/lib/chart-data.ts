import type { Candle } from '@chivo/contracts';

export interface ChartPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function candleToChartPoint(candle: Candle): ChartPoint {
  const time = Math.floor(Date.parse(candle.openTime) / 1000);
  return {
    time,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

export function candleToChartUpdate(candle: Candle): ChartPoint {
  return candleToChartPoint(candle);
}

export function formatSource(source: 'BINANCE' | 'CACHE'): string {
  return source === 'BINANCE' ? 'Binance (en vivo)' : 'Caché local';
}

export function formatCandleTime(isoTime: string): string {
  return new Date(isoTime).toLocaleString('es-ES');
}
