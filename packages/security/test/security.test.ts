import { describe, expect, it } from 'vitest';

import {
  createOpaqueToken,
  decryptString,
  encryptString,
  hashOpaqueToken,
  hashPassword,
  parseEncryptionKey,
  verifyPassword,
  assertAdminPassword,
} from '../src';

describe('password hashing', () => {
  it('hashes and verifies a password without storing it', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', hash)).resolves.toBe(false);
  });

  it('uses a fresh salt for each hash', async () => {
    const first = await hashPassword('same password');
    const second = await hashPassword('same password');

    expect(first).not.toBe(second);
  });

  it('rejects malformed hashes and invalid inputs without throwing', async () => {
    await expect(verifyPassword('password', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('password', 'scrypt$1$8$1$abc$def')).resolves.toBe(false);
    await expect(verifyPassword('', await hashPassword('password'))).resolves.toBe(false);
  });

  it('enforces the admin password length', () => {
    expect(() => assertAdminPassword('short')).toThrow(/at least 12/);
    expect(() => assertAdminPassword('a'.repeat(12))).not.toThrow();
  });
});

describe('authenticated encryption', () => {
  const key = parseEncryptionKey(Buffer.alloc(32, 7).toString('base64'));

  it('round-trips with a versioned payload', () => {
    const encrypted = encryptString('totp-secret', key);

    expect(encrypted).toMatch(/^v1\./);
    expect(encrypted).not.toContain('totp-secret');
    expect(decryptString(encrypted, key)).toBe('totp-secret');
  });

  it('rejects tampered payloads and the wrong key', () => {
    const encrypted = encryptString('totp-secret', key);
    const tampered = `${encrypted.slice(0, -2)}AA`;

    expect(() => decryptString(tampered, key)).toThrow();
    expect(() => decryptString(encrypted, Buffer.alloc(32, 8))).toThrow();
  });

  it('validates key length', () => {
    expect(() => parseEncryptionKey('')).toThrow();
    expect(() => parseEncryptionKey(Buffer.alloc(16).toString('base64'))).toThrow(/32 bytes/);
  });
});

describe('opaque tokens', () => {
  it('creates unique tokens and stores only their digest', () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).not.toBe(second);
    expect(hashOpaqueToken(first)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
    expect(hashOpaqueToken(first)).not.toBe(first);
  });
});
