import { z } from 'zod';

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string().optional(),
  action: z.string(),
  resource: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
