import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing parameters are part of the stored hash. Verification only
 * accepts the current parameters so a malformed or hostile hash cannot force
 * an expensive scrypt run.
 */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY = 64 * 1024 * 1024;
const HASH_PREFIX = 'scrypt';
const MAX_PASSWORD_LENGTH = 256;

export const MIN_ADMIN_PASSWORD_LENGTH = 12;

function assertPasswordInput(password: string): void {
  if (typeof password !== 'string' || password.length === 0) {
    throw new TypeError('password must be a non-empty string');
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new TypeError(`password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  const options: ScryptOptions = {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  };

  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordInput(password);
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(password, salt);

  return [
    HASH_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  if (
    typeof password !== 'string' ||
    password.length === 0 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== HASH_PREFIX) {
    return false;
  }

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4] ?? '', 'base64url');
    expected = Buffer.from(parts[5] ?? '', 'base64url');
  } catch {
    return false;
  }

  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) {
    return false;
  }

  try {
    const actual = await deriveKey(password, salt);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function assertAdminPassword(password: string): void {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new TypeError(
      `admin password must contain at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    );
  }
}
