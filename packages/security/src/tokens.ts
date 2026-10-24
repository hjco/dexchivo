import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_TOKEN_BYTES = 32;

export function createOpaqueToken(byteLength: number = DEFAULT_TOKEN_BYTES): string {
  if (!Number.isInteger(byteLength) || byteLength < 16 || byteLength > 128) {
    throw new TypeError('token byte length must be an integer between 16 and 128');
  }
  return randomBytes(byteLength).toString('base64url');
}

/**
 * Only the SHA-256 digest of a session token is persisted. The raw token lives
 * in the httpOnly cookie and cannot be recovered from the database.
 */
export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
