import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { AppInstance } from '../src/app';
import { createTestApp, testConfig } from './support/fakes';

let app: AppInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('health endpoints', () => {
  it('reports liveness', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'chivo-api',
      version: '0.1.0',
    });
  });

  it('reports configuration, database and redis readiness', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      checks: [
        {
          name: 'configuration',
          status: 'ok',
          detail: 'PAPER only; LIVE trading disabled',
        },
        { name: 'database', status: 'ok' },
        { name: 'redis', status: 'ok' },
      ],
    });
  });

  it('returns 503 when a dependency is unavailable', async () => {
    const failingApp = await createTestApp({
      readiness: async () => [
        { name: 'database', status: 'ok', detail: 'test database' },
        { name: 'redis', status: 'error', detail: 'Redis is not reachable' },
      ],
    });

    const response = await failingApp.inject({ method: 'GET', url: '/health/ready' });

    const body = response.json();
    expect(response.statusCode).toBe(503);
    expect(body.status).toBe('error');
    expect(body.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'redis', status: 'error' })]),
    );
    await failingApp.close();
  });

  it('echoes a safe request id and generates one when absent', async () => {
    const provided = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { 'x-request-id': 'req-m1-test' },
    });
    const generated = await app.inject({ method: 'GET', url: '/health/live' });

    expect(provided.headers['x-request-id']).toBe('req-m1-test');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('system metadata', () => {
  it('publishes PAPER mode and explicit M1 limitations', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/system/info' });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.executionMode).toBe('PAPER');
    expect(body.liveTradingEnabled).toBe(false);
    expect(body.controlModes).toEqual(['MANUAL', 'AUTO']);
    expect(body.limitations).toEqual(
      expect.arrayContaining([expect.stringContaining('single-administrator')]),
    );
  });

  it('returns a structured 401 for protected routes without auth', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/orders' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    });
  });
});

describe('OpenAPI and CORS', () => {
  it('serves generated OpenAPI 3.1 documentation', async () => {
    const response = await app.inject({ method: 'GET', url: '/docs/json' });
    const document = response.json();

    expect(response.statusCode).toBe(200);
    expect(document.openapi).toBe('3.1.0');
    expect(document.paths['/health/live']).toBeDefined();
    expect(document.paths['/api/v1/system/info']).toBeDefined();
    expect(document.paths['/api/v1/auth/login']).toBeDefined();
    expect(document.paths['/api/v1/markets']).toBeDefined();
    expect(document.paths['/api/v1/orders']).toBeDefined();
    expect(document.components.securitySchemes.cookieAuth.name).toBe('chivo_session');
  });

  it('allows the configured dashboard origin only', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/health/live',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('does not reflect an untrusted origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
      headers: { origin: 'http://evil.example' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('keeps the test configuration stable', () => {
    expect(testConfig().sessionCookieSecure).toBe(false);
  });
});
