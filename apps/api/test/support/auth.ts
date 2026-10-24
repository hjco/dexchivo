import { AuthService } from '../../src/auth/auth-service';
import { InMemoryAuthStore } from '../../src/auth/in-memory-auth-store';
import type { AuthUser } from '@chivo/contracts';

export const TEST_EMAIL = 'admin@chivo.local';
export const TEST_PASSWORD = 'TestPass123!';
export const TEST_USER_ID = '9f3b7a42-8d26-4c91-b705-02e86ad75431';

export function testUser(overrides: Partial<AuthUser> = {} as any): AuthUser {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: overrides.id ?? TEST_USER_ID,
    email: overrides.email ?? TEST_EMAIL,
    displayName: (overrides as any).displayName ?? 'Administrador',
    totpEnabled: (overrides as any).totpEnabled ?? false,
    createdAt: (overrides as any).createdAt ?? now.toISOString(),
  } as AuthUser;
}

export function createTestAuthService(store: InMemoryAuthStore, options?: any): AuthService {
  const svc = new AuthService(store as any, {
    maxAttempts: options?.maxAttempts ?? 5,
    windowMs: options?.windowMs ?? 60_000,
    lockMs: options?.lockMs ?? 300_000,
  } as any, {
    authEncryptionKey: Buffer.alloc(32, 1).toString('base64'),
    sessionTtlMs: 3600000,
  } as any);
  return svc;
}

export { InMemoryAuthStore };
