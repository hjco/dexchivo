import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Secret, TOTP } from 'otpauth';

import { hashPassword } from '@chivo/security';

import type { AppInstance } from '../src/app';
import { type AuthService } from '../src/auth/auth-service';
import {
  createTestApp,
  createTestAuthService,
  InMemoryAuthStore,
  TEST_EMAIL,
  TEST_ENCRYPTION_KEY,
  TEST_PASSWORD,
  TEST_USER_ID,
  testUser,
} from './support/fakes';

function cookieFrom(response: {
  headers: Record<string, string | string[] | number | undefined>;
}): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') {
    throw new Error('expected a set-cookie header');
  }
  return value.split(';')[0] ?? '';
}

function totpCode(secret: string): string {
  return new TOTP({ secret: Secret.fromBase32(secret) }).generate();
}

describe('authentication routes', () => {
  let app: AppInstance;
  let store: InMemoryAuthStore;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hashPassword(TEST_PASSWORD);
    store = new InMemoryAuthStore([testUser({ passwordHash })]);
    app = await createTestApp({
      authService: createTestAuthService(store, {
        encryptionKey: Buffer.from(TEST_ENCRYPTION_KEY, 'base64'),
      }),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected endpoints without a session', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('rejects invalid credentials and records the failure without leaking details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrong-password' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    expect(response.body).not.toContain(passwordHash);
    expect(store.audits.some((audit) => audit.action === 'auth.login.failed')).toBe(true);
  });

  it('creates an httpOnly session and returns the administrator', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL.toUpperCase(), password: TEST_PASSWORD },
      headers: { 'user-agent': 'vitest' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: { id: TEST_USER_ID, email: TEST_EMAIL, totpEnabled: false },
    });
    const setCookie = response.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie);
    expect(cookieHeader).toContain('chivo_session=');
    expect(cookieHeader).toContain('HttpOnly');
    expect(cookieHeader).toContain('SameSite=Lax');
    expect(cookieHeader).toContain('Path=/');
    expect(response.headers['cache-control']).toBe('no-store');

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { cookie: cookieFrom(response) },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({
      user: { id: TEST_USER_ID, email: TEST_EMAIL },
      twoFactorAvailable: true,
    });
  });

  it('logs out and invalidates the session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const cookie = cookieFrom(login);

    const logout = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie },
    });
    expect(logout.statusCode).toBe(204);
    expect(String(logout.headers['set-cookie'])).toContain('chivo_session=');

    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });
    expect(me.statusCode).toBe(401);
  });

  it('throttles repeated failed logins', async () => {
    const limitedStore = new InMemoryAuthStore([testUser({ passwordHash })]);
    const limitedApp = await createTestApp({
      authService: createTestAuthService(limitedStore, { maxAttempts: 2 }),
    });

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await limitedApp.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: TEST_EMAIL, password: 'bad-password' },
        });
        expect(response.statusCode).toBe(401);
      }

      const blocked = await limitedApp.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: TEST_EMAIL, password: 'bad-password' },
      });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.headers['retry-after']).toBeDefined();
      expect(blocked.json()).toMatchObject({ error: { code: 'RATE_LIMITED' } });
    } finally {
      await limitedApp.close();
    }
  });

  it('sets up and enforces TOTP two-factor authentication', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const cookie = cookieFrom(login);

    const setup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/2fa/setup',
      headers: { cookie },
    });
    expect(setup.statusCode).toBe(200);
    const setupBody = setup.json() as { secret: string; otpauthUrl: string };
    expect(setupBody.secret.length).toBeGreaterThan(15);
    expect(setupBody.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);

    const code = totpCode(setupBody.secret);
    const enable = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/2fa/enable',
      headers: { cookie },
      payload: { code },
    });
    expect(enable.statusCode).toBe(200);
    expect(enable.json()).toEqual({ enabled: true });

    const me = await app.inject({ method: 'GET', url: '/api/v1/me', headers: { cookie } });
    expect(me.json()).toMatchObject({ user: { totpEnabled: true } });

    const missingCode = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(missingCode.statusCode).toBe(401);
    expect(missingCode.json()).toMatchObject({ error: { code: 'TWO_FACTOR_REQUIRED' } });

    const withCode = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD, totpCode: totpCode(setupBody.secret) },
    });
    expect(withCode.statusCode).toBe(200);
    const newCookie = cookieFrom(withCode);

    const disable = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/2fa/disable',
      headers: { cookie: newCookie },
      payload: { code: totpCode(setupBody.secret) },
    });
    expect(disable.statusCode).toBe(200);
    expect(disable.json()).toEqual({ enabled: false });
  });
});

describe('session lifecycle', () => {
  it('expires sessions based on the configured clock', async () => {
    let now = new Date('2026-01-01T00:00:00.000Z');
    const store = new InMemoryAuthStore([
      testUser({ passwordHash: await hashPassword(TEST_PASSWORD) }),
    ]);
    const service = createTestAuthService(store, {
      now: () => now,
      sessionTtlMs: 1_000,
    });

    const result = await service.login({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(result.user.id).toBe(TEST_USER_ID);

    now = new Date('2026-01-01T00:00:02.000Z');
    await expect(service.authenticate(result.token)).resolves.toBeNull();
  });

  it('does not allow another user to reuse a token after session invalidation', async () => {
    const store = new InMemoryAuthStore([
      testUser({ passwordHash: await hashPassword(TEST_PASSWORD) }),
    ]);
    const service: AuthService = createTestAuthService(store);
    const result = await service.login({ email: TEST_EMAIL, password: TEST_PASSWORD });

    await service.logout(result.token);
    await expect(service.authenticate(result.token)).resolves.toBeNull();
  });
});
