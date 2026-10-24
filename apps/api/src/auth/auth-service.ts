import { randomUUID } from 'node:crypto';

import { hashPassword, verifyPassword } from '@chivo/security';
import type { AuthUser } from '@chivo/contracts';

import type { AppConfig } from '../config';
import { AuthError } from './types';
import type { AuthStore } from './types';
import { LoginThrottle } from './throttle';
import { encryptSecret, decryptSecret } from './totp';

export interface AuthServiceOptions {
  maxAttempts: number;
  windowMs: number;
  lockMs: number;
}

export class AuthService {
  private readonly throttle: LoginThrottle;

  constructor(
    private readonly store: AuthStore,
    private readonly options: AuthServiceOptions,
    private readonly config: AppConfig,
  ) {
    this.throttle = new LoginThrottle({
      maxAttempts: options.maxAttempts,
      windowMs: options.windowMs,
      lockMs: options.lockMs,
    });
  }

  async login(input: {
    email: string;
    password: string;
    totpCode?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const throttleKey = `${input.ipAddress ?? 'unknown'}:${email}`;
    const decision = this.throttle.check(throttleKey);
    if (!decision.allowed) {
      throw new AuthError(
        429,
        'TOO_MANY_ATTEMPTS',
        `Demasiados intentos. Vuelve a intentarlo en ${decision.retryAfterSeconds} segundos.`,
        decision.retryAfterSeconds,
      );
    }

    const userRecord = await this.store.findUserByEmail(email);
    if (!userRecord) {
      this.throttle.recordFailure(throttleKey);
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    const valid = await verifyPassword(input.password, userRecord.passwordHash);
    if (!valid) {
      this.throttle.recordFailure(throttleKey);
      throw new AuthError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas.');
    }

    if (userRecord.totpEnabled) {
      if (!input.totpCode) {
        throw new AuthError(401, 'TOTP_REQUIRED', 'Se requiere código TOTP.');
      }
      if (!userRecord.totpSecret) {
        throw new AuthError(503, 'TOTP_NOT_CONFIGURED', 'La autenticación de dos factores no está configurada correctamente.');
      }
      const secret = decryptSecret(userRecord.totpSecret, this.config.authEncryptionKey);
      if (!this.verifyTotp(secret, input.totpCode)) {
        this.throttle.recordFailure(throttleKey);
        throw new AuthError(401, 'TOTP_INVALID', 'Código TOTP inválido.');
      }
    }

    this.throttle.reset(throttleKey);

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs);
    await this.store.createSession({
      id: randomUUID(),
      userId: userRecord.id,
      tokenHash: await this.hashToken(token),
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    await this.store.writeAudit({
      userId: userRecord.id,
      actor: 'user',
      action: 'auth.login',
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const user: AuthUser = {
      id: userRecord.id,
      email: userRecord.email,
      totpEnabled: userRecord.totpEnabled,
    };

    return { token, expiresAt, user };
  }

  async logout(token: string | undefined, context?: { ipAddress?: string; userAgent?: string }) {
    if (!token) {
      return;
    }
    const tokenHash = await this.hashToken(token);
    const session = await this.store.findSessionByTokenHash(tokenHash);
    if (!session) {
      return;
    }
    await this.store.deleteSessionByTokenHash(tokenHash);
    await this.store.writeAudit({
      userId: session.user.id,
      actor: 'user',
      action: 'auth.logout',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  async authenticate(token: string | undefined) {
    if (!token) {
      throw new AuthError(401, 'UNAUTHENTICATED', 'No se encontró una sesión válida.');
    }
    const tokenHash = await this.hashToken(token);
    const session = await this.store.findSessionByTokenHash(tokenHash);
    if (!session) {
      throw new AuthError(401, 'UNAUTHENTICATED', 'No se encontró una sesión válida.');
    }
    if (session.session.expiresAt < new Date()) {
      await this.store.deleteSessionByTokenHash(tokenHash);
      throw new AuthError(401, 'SESSION_EXPIRED', 'La sesión ha expirado.');
    }
    await this.store.touchSession(session.session.id, new Date());
    return { user: session.user, session: session.session };
  }

  async setupTotp(userId: string) {
    const user = await this.store.findUserById(userId);
    if (!user) {
      throw new AuthError(401, 'UNAUTHENTICATED', 'No se encontró una sesión válida.');
    }
    const secret = this.generateSecret();
    const encrypted = encryptSecret(secret, this.config.authEncryptionKey);
    await this.store.updateUserTotp(userId, { totpSecret: encrypted, totpEnabled: false });
    return { secret, otpauthUrl: this.buildOtpauthUrl(user.email, secret) };
  }

  async enableTotp(userId: string, code: string) {
    const user = await this.store.findUserById(userId);
    if (!user || !user.totpSecret) {
      throw new AuthError(400, 'TOTP_SETUP_REQUIRED', 'Es necesario configurar TOTP primero.');
    }
    const secret = decryptSecret(user.totpSecret, this.config.authEncryptionKey);
    if (!this.verifyTotp(secret, code)) {
      throw new AuthError(401, 'TOTP_INVALID', 'Código TOTP inválido.');
    }
    await this.store.updateUserTotp(userId, { totpSecret: user.totpSecret, totpEnabled: true });
    await this.store.writeAudit({
      userId,
      actor: 'user',
      action: 'auth.totp.enabled',
    });
    return { enabled: true };
  }

  async disableTotp(userId: string, code: string) {
    const user = await this.store.findUserById(userId);
    if (!user || !user.totpSecret) {
      throw new AuthError(400, 'TOTP_NOT_ENABLED', 'TOTP no está habilitado.');
    }
    const secret = decryptSecret(user.totpSecret, this.config.authEncryptionKey);
    if (!this.verifyTotp(secret, code)) {
      throw new AuthError(401, 'TOTP_INVALID', 'Código TOTP inválido.');
    }
    await this.store.updateUserTotp(userId, { totpSecret: null, totpEnabled: false });
    await this.store.writeAudit({
      userId,
      actor: 'user',
      action: 'auth.totp.disabled',
    });
    return { enabled: false };
  }

  async getTotpStatus(userId: string) {
    const user = await this.store.findUserById(userId);
    if (!user) {
      throw new AuthError(401, 'UNAUTHENTICATED', 'No se encontró una sesión válida.');
    }
    return { enabled: user.totpEnabled };
  }

  private async hashToken(token: string) {
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Buffer.from(digest).toString('hex');
  }

  private generateSecret() {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    return Buffer.from(bytes).toString('base32');
  }

  private buildOtpauthUrl(email: string, secret: string) {
    const issuer = 'Chivo';
    const label = encodeURIComponent(`${issuer}:${email}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }

  private verifyTotp(secret: string, code: string) {
    const { TOTP } = require('otpauth');
    const totp = new TOTP({
      issuer: 'Chivo',
      label: 'admin',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  }
}
