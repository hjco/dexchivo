import type { Prisma, PrismaClient } from '@chivo/database';

import type {
  AuditInput,
  AuthStore,
  CreateSessionInput,
  SessionRecord,
  SessionWithUser,
  UserRecord,
} from './types';

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

function mapUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    totpSecret: row.totpSecret,
    totpEnabled: row.totpEnabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}

function auditData(input: AuditInput): Prisma.AuditLogUncheckedCreateInput {
  return {
    ...(input.userId === undefined ? {} : { userId: input.userId }),
    actor: input.actor,
    action: input.action,
    ...(input.targetType === undefined ? {} : { targetType: input.targetType }),
    ...(input.targetId === undefined ? {} : { targetId: input.targetId }),
    ...(input.metadata === undefined ? {} : { metadata: input.metadata as Prisma.InputJsonValue }),
    ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
    ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
  };
}

export class PrismaAuthStore implements AuthStore {
  constructor(private readonly prisma: PrismaClient) {}

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? mapUser(row) : null;
  }

  async findUserById(id: string): Promise<UserRecord | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? mapUser(row) : null;
  }

  async updateUserTotp(
    userId: string,
    data: { totpSecret: string | null; totpEnabled: boolean },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: data.totpSecret,
        totpEnabled: data.totpEnabled,
      },
    });
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.prisma.session.create({
      data: {
        id: input.id,
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }),
        ...(input.userAgent === undefined ? {} : { userAgent: input.userAgent }),
      },
    });
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    const row = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!row) {
      return null;
    }

    return {
      session: mapSession(row),
      user: mapUser(row.user),
    };
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }

  async touchSession(sessionId: string, lastUsedAt: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId },
      data: { lastUsedAt },
    });
  }

  async writeAudit(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({ data: auditData(input) });
  }
}
