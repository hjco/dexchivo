import { describe, expect, it, vi } from 'vitest';

import { apiStatusLabel, executionModeLabel, fetchSystemInfo, getApiBaseUrl } from '../lib/runtime';

const info = {
  service: 'chivo-api',
  version: '0.1.0',
  executionMode: 'PAPER',
  liveTradingEnabled: false,
  controlModes: ['MANUAL', 'AUTO'],
  role: 'ORCHESTRATION_AND_API',
  limitations: ['M0 scaffold only'],
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('dashboard runtime data', () => {
  it('parses a valid API response', async () => {
    const fetcher = vi.fn(() => Promise.resolve(response(info))) as unknown as typeof fetch;
    const result = await fetchSystemInfo(fetcher);

    expect(result).toMatchObject({ executionMode: 'PAPER', version: '0.1.0' });
    expect(fetcher).toHaveBeenCalledWith(
      new URL('/api/v1/system/info', getApiBaseUrl()),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('returns null for non-2xx, invalid payloads and network failures', async () => {
    const rejected = vi.fn(() => Promise.resolve(response(info, 503))) as unknown as typeof fetch;
    const invalid = vi.fn(() =>
      Promise.resolve(response({ ...info, liveTradingEnabled: true })),
    ) as unknown as typeof fetch;
    const offline = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;

    await expect(fetchSystemInfo(rejected)).resolves.toBeNull();
    await expect(fetchSystemInfo(invalid)).resolves.toBeNull();
    await expect(fetchSystemInfo(offline)).resolves.toBeNull();
  });

  it('uses explicit Spanish labels', () => {
    expect(executionModeLabel('PAPER')).toContain('Simulación');
    expect(executionModeLabel('LIVE')).toContain('Dinero real');
    expect(apiStatusLabel(null)).toBe('API no disponible');
    expect(apiStatusLabel({ ...info, executionMode: 'PAPER' } as never)).toBe('API conectada');
  });
});
