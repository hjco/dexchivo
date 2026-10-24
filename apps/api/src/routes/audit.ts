import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import { AuditService } from '../audit/service';

const audit = new AuditService();

export async function registerAuditRoutes(app: AppInstance, authService: AuthService): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get('/api/v1/audit', { preHandler: requireAuth }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    const limit = Number((request.query as Record<string, string>)?.limit ?? '100');
    return { entries: audit.list(Number.isNaN(limit) ? 100 : limit) };
  });
}
