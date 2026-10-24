import { randomUUID } from 'node:crypto';

export interface AuditEntry {
  id: string;
  actorId?: string;
  action: string;
  resource: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class AuditService {
  private entries: AuditEntry[] = [];

  log(entry: Omit<AuditEntry, 'id' | 'createdAt'>): AuditEntry {
    const e: AuditEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.unshift(e);
    return e;
  }

  list(limit = 100): AuditEntry[] {
    return this.entries.slice(0, limit);
  }
}
