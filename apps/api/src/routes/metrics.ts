import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import { getMetrics } from '../observability/metrics';

export async function registerMetricsRoutes(
  app: AppInstance,
  authService: AuthService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get(
    '/api/v1/metrics',
    { preHandler: requireAuth, schema: { tags: ['metrics'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return getMetrics();
    },
  );
}
