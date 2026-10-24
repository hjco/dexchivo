import type { AuthUser } from '@chivo/contracts';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface SessionWithUser {
  session: SessionRecord;
  user: UserRecord;
}

export interface CreateSessionInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditInput {
  userId?: string | null | undefined;
  actor: string;
  action: string;
  targetType?: string | undefined;
  targetId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuthStore {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: string): Promise<UserRecord | null>;
  updateUserTotp(
    userId: string,
    data: { totpSecret: string | null; totpEnabled: boolean },
  ): Promise<void>;
  createSession(input: CreateSessionInput): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionWithUser | null>;
  deleteSessionByTokenHash(tokenHash: string): Promise<void>;
  touchSession(sessionId: string, lastUsedAt: Date): Promise<void>;
  writeAudit(input: AuditInput): Promise<void>;
}

export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: AuthUser;
}

export interface AuthenticatedContext {
  user: UserRecord;
  session: SessionRecord;
}

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'TWO_FACTOR_REQUIRED'
  | 'INVALID_TWO_FACTOR'
  | 'TWO_FACTOR_UNAVAILABLE'
  | 'TWO_FACTOR_ALREADY_ENABLED'
  | 'TWO_FACTOR_NOT_ENABLED'
  | 'TWO_FACTOR_NOT_CONFIGURED'
  | 'RATE_LIMITED';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: AuthErrorCode,
    message: string,
    statusCode: number,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function toAuthUser(user: UserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    totpEnabled: user.totpEnabled,
    createdAt: user.createdAt.toISOString(),
  };
}
