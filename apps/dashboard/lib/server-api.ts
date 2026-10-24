import type { CandleListResponse, MarketListResponse, MeResponse } from '@chivo/contracts';
import {
  candleListResponseSchema,
  marketListResponseSchema,
  meResponseSchema,
} from '@chivo/contracts';

import { getApiBaseUrl } from './runtime';
import { cookies } from 'next/headers';

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = new URL(path, getApiBaseUrl());
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  return fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(init.headers ?? {}),
    },
  });
}

export async function fetchMe(): Promise<MeResponse | null> {
  try {
    const response = await apiFetch('/api/v1/me');
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const parsed = meResponseSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function fetchMarkets(): Promise<MarketListResponse | null> {
  try {
    const response = await apiFetch('/api/v1/markets');
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const parsed = marketListResponseSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function fetchCandles(
  instrumentId: string,
  timeframe: string,
  limit = 300,
): Promise<CandleListResponse | null> {
  try {
    const response = await apiFetch(
      `/api/v1/candles?instrumentId=${encodeURIComponent(instrumentId)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`,
    );
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const parsed = candleListResponseSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
