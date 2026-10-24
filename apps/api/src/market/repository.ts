import type { Instrument, Quote } from './types';

export interface MarketRepository {
  getInstruments(): Promise<Instrument[]>;
  upsertInstruments(instruments: Instrument[]): Promise<void>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
  upsertQuotes(quotes: Quote[]): Promise<void>;
  getQuote(symbol: string): Promise<Quote | null>;
}

export class InMemoryMarketRepository implements MarketRepository {
  private instruments = new Map<string, Instrument>();
  private quotes = new Map<string, Quote>();
  public fetchedAt: Date | null = null;

  async getInstruments(): Promise<Instrument[]> {
    return Array.from(this.instruments.values());
  }

  async upsertInstruments(instruments: Instrument[]): Promise<void> {
    for (const i of instruments) {
      this.instruments.set(i.symbol, i);
    }
    this.fetchedAt = new Date();
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const s of symbols) {
      const q = this.quotes.get(s);
      if (q) out.push(q);
    }
    return out;
  }

  async upsertQuotes(quotes: Quote[]): Promise<void> {
    for (const q of quotes) {
      this.quotes.set(q.symbol, q);
    }
    this.fetchedAt = new Date();
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    return this.quotes.get(symbol) ?? null;
  }

  async getLastSync(date?: Date): Promise<Date | null> {
    if (date) {
      this.fetchedAt = date;
      return this.fetchedAt;
    }
    return this.fetchedAt;
  }

  async listInstruments() {
    return this.getInstruments();
  }

  async findInstrument(symbol: string) {
    return this.instruments.get(symbol) ?? null;
  }
}
