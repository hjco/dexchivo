import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const FORMAT_VERSION = 'v1';
const AAD = Buffer.from('chivo:security:v1', 'utf8');

export function parseEncryptionKey(encodedKey: string): Buffer {
  const trimmed = encodedKey.trim();
  if (trimmed.length === 0) {
    throw new TypeError('encryption key must not be empty');
  }

  const key = Buffer.from(trimmed, 'base64');
  if (key.length !== KEY_LENGTH) {
    throw new TypeError('encryption key must decode to exactly 32 bytes (base64)');
  }

  return key;
}

export function encryptString(plaintext: string, key: Buffer): string {
  if (key.length !== KEY_LENGTH) {
    throw new TypeError('encryption key must be 32 bytes');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptString(payload: string, key: Buffer): string {
  if (key.length !== KEY_LENGTH) {
    throw new TypeError('encryption key must be 32 bytes');
  }

  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('unsupported encrypted value');
  }

  const iv = Buffer.from(parts[1] ?? '', 'base64url');
  const tag = Buffer.from(parts[2] ?? '', 'base64url');
  const ciphertext = Buffer.from(parts[3] ?? '', 'base64url');

  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error('invalid encrypted value');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
