import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config';

describe('API configuration', () => {
  it('defaults to PAPER with LIVE disabled', () => {
    const config = loadConfig({});

    expect(config.executionMode).toBe('PAPER');
    expect(config.liveTradingEnabled).toBe(false);
    expect(config.port).toBe(4000);
  });

  it('rejects LIVE execution mode', () => {
    expect(() => loadConfig({ EXECUTION_MODE: 'LIVE' })).toThrow(/PAPER execution only/);
  });

  it('rejects the LIVE feature flag', () => {
    expect(() => loadConfig({ ENABLE_LIVE_TRADING: 'true' })).toThrow(
      /ENABLE_LIVE_TRADING must be false/,
    );
  });

  it('rejects invalid ports and origins', () => {
    expect(() => loadConfig({ API_PORT: '70000' })).toThrow();
    expect(() => loadConfig({ DASHBOARD_ORIGIN: 'not-a-url' })).toThrow();
  });
});
