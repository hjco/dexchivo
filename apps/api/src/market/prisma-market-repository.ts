import type { Prisma, PrismaClient } from '@chivo/database';
import { instrumentSchema, type Candle, type Instrument, type Timeframe } from '@chivo/contracts';

import type { CandleSnapshot, InstrumentSnapshot, MarketRepository } from './repository';

interface DecimalLike {
  toString(): string;
}

interface InstrumentRow {
  instrumentId: string;
  exchange: string;
  marketType: string;
  venueSymbol: string;
  baseAsset: string;
  quoteAsset: string;
  settleAsset: string | null;
  status: string;
  tickSize: DecimalLike;
  stepSize: DecimalLike;
  minNotional: DecimalLike | null;
  contractMultiplier: DecimalLike;
  quantityUnit: string;
  pricePrecision: number;
  quantityPrecision: number;
  maxLeverage: DecimalLike | null;
  capabilities: Prisma.JsonValue;
}

interface CandleRow {
  instrumentId: string;
  timeframe: string;
  openTime: Date;
  closeTime: Date;
  open: DecimalLike;
  high: DecimalLike;
  low: DecimalLike;
  close: DecimalLike;
  volume: DecimalLike;
  isClosed: boolean;
}

function decimalString(value: DecimalLike): string {
  return value.toString();
}

function mapInstrument(row: InstrumentRow): Instrument {
  return instrumentSchema.parse({
    instrumentId: row.instrumentId,
    exchange: row.exchange,
    marketType: row.marketType,
    venueSymbol: row.venueSymbol,
    baseAsset: row.baseAsset,
    quoteAsset: row.quoteAsset,
    ...(row.settleAsset === null ? {} : { settleAsset: row.settleAsset }),
    status: row.status,
    tickSize: decimalString(row.tickSize),
    stepSize: decimalString(row.stepSize),
    ...(row.minNotional === null ? {} : { minNotional: decimalString(row.minNotional) }),
    contractMultiplier: decimalString(row.contractMultiplier),
    quantityUnit: row.quantityUnit,
    pricePrecision: row.pricePrecision,
    quantityPrecision: row.quantityPrecision,
    ...(row.maxLeverage === null ? {} : { maxLeverage: decimalString(row.maxLeverage) }),
    capabilities: row.capabilities,
  });
}

function mapCandle(row: CandleRow): Candle {
  return {
    instrumentId: row.instrumentId,
    timeframe: row.timeframe as Timeframe,
    openTime: row.openTime.toISOString(),
    closeTime: row.closeTime.toISOString(),
    open: decimalString(row.open),
    high: decimalString(row.high),
    low: decimalString(row.low),
    close: decimalString(row.close),
    volume: decimalString(row.volume),
    isClosed: row.isClosed,
  };
}

function instrumentData(instrument: Instrument) {
  return {
    exchange: instrument.exchange,
    marketType: instrument.marketType,
    venueSymbol: instrument.venueSymbol,
    baseAsset: instrument.baseAsset,
    quoteAsset: instrument.quoteAsset,
    settleAsset: instrument.settleAsset ?? null,
    status: instrument.status,
    tickSize: instrument.tickSize,
    stepSize: instrument.stepSize,
    minNotional: instrument.minNotional ?? null,
    contractMultiplier: instrument.contractMultiplier,
    quantityUnit: instrument.quantityUnit,
    pricePrecision: instrument.pricePrecision,
    quantityPrecision: instrument.quantityPrecision,
    maxLeverage: instrument.maxLeverage ?? null,
    capabilities: instrument.capabilities as unknown as Prisma.InputJsonValue,
  };
}

export class PrismaMarketRepository implements MarketRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listInstruments(): Promise<InstrumentSnapshot> {
    const [rows, aggregate] = await Promise.all([
      this.prisma.instrument.findMany({ orderBy: { venueSymbol: 'asc' } }),
      this.prisma.instrument.aggregate({ _max: { updatedAt: true } }),
    ]);

    return {
      instruments: rows.map(mapInstrument),
      fetchedAt: aggregate._max.updatedAt?.toISOString() ?? null,
    };
  }

  async findInstrument(instrumentId: string): Promise<Instrument | null> {
    const row = await this.prisma.instrument.findUnique({ where: { instrumentId } });
    return row ? mapInstrument(row) : null;
  }

  async upsertInstruments(instruments: Instrument[]): Promise<void> {
    if (instruments.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      instruments.map((instrument) =>
        this.prisma.instrument.upsert({
          where: { instrumentId: instrument.instrumentId },
          create: { instrumentId: instrument.instrumentId, ...instrumentData(instrument) },
          update: instrumentData(instrument),
        }),
      ),
    );
  }

  async upsertCandles(candles: Candle[]): Promise<void> {
    if (candles.length === 0) {
      return;
    }

    const ingestedAt = new Date();
    await this.prisma.$transaction(
      candles.map((candle) => {
        const data = {
          closeTime: new Date(candle.closeTime),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          isClosed: candle.isClosed,
          ingestedAt,
        };

        return this.prisma.candle.upsert({
          where: {
            instrumentId_timeframe_openTime: {
              instrumentId: candle.instrumentId,
              timeframe: candle.timeframe,
              openTime: new Date(candle.openTime),
            },
          },
          create: {
            instrumentId: candle.instrumentId,
            timeframe: candle.timeframe,
            openTime: new Date(candle.openTime),
            ...data,
          },
          update: data,
        });
      }),
    );
  }

  async listCandles(
    instrumentId: string,
    timeframe: Timeframe,
    limit: number,
  ): Promise<CandleSnapshot> {
    const [rows, aggregate] = await Promise.all([
      this.prisma.candle.findMany({
        where: { instrumentId, timeframe },
        orderBy: { openTime: 'desc' },
        take: limit,
      }),
      this.prisma.candle.aggregate({
        where: { instrumentId, timeframe },
        _max: { ingestedAt: true },
      }),
    ]);

    return {
      candles: rows.reverse().map(mapCandle),
      fetchedAt: aggregate._max.ingestedAt?.toISOString() ?? null,
    };
  }
}
