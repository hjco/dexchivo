import type { MarketDataClient } from '../../src/market/types';

export class FakeMarketDataClient implements MarketDataClient {
  async fetchExchangeInfo(): Promise<any> {
    return {};
  }

  async fetchTickers(): Promise<any[]> {
    return [
      {
        symbol: 'BTCUSDT',
        lastPrice: '68000.50',
        bidPrice: '68000.40',
        askPrice: '68000.60',
        highPrice: '68500.00',
        lowPrice: '67500.00',
        volume: '1234.56',
        quoteVolume: '84000000.00',
        priceChangePercent: '1.25',
        closeTime: 1729728000000,
      },
      {
        symbol: 'ETHUSDT',
        lastPrice: '3500.25',
        bidPrice: '3500.20',
        askPrice: '3500.30',
        highPrice: '3550.00',
        lowPrice: '3450.00',
        volume: '4567.89',
        quoteVolume: '16000000.00',
        priceChangePercent: '-0.80',
        closeTime: 1729728000000,
      },
    ];
  }

  async fetchKlines(): Promise<any[]> {
    const now = Date.now();
    return Array.from({ length: 10 }, (_, index) => [
      now - (9 - index) * 60_000,
      '68000.00',
      '68100.00',
      '67950.00',
      '68050.00',
      '100.25',
      now - (9 - index) * 60_000 + 59_000,
      '6805000.00',
      150,
      '50.25',
      '3410000.00',
      '0',
    ]);
  }

  openKlineStream() {
    return null as any;
  }
}
