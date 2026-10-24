import { Secret, TOTP } from 'otpauth';

export interface TotpSetup {
  secret: string;
  otpauthUrl: string;
}

export function createTotpSetup(email: string, issuer: string): TotpSetup {
  const secret = new Secret({ size: 20 });
  const totp = new TOTP({
    issuer,
    label: email,
    secret,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return {
    secret: secret.base32,
    otpauthUrl: totp.toString(),
  };
}

export function verifyTotpCode(secret: string, code: string, now: Date = new Date()): boolean {
  try {
    const totp = new TOTP({ secret: Secret.fromBase32(secret) });
    return totp.validate({ token: code, timestamp: now.getTime(), window: 1 }) !== null;
  } catch {
    return false;
  }
}

export function encryptSecret(secret: string, key: string): string {
  return secret;
}

export function decryptSecret(secret: string, key: string): string {
  return secret;
}
