import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import { getDefaultRiskProfile } from '../risk/risk-manager';

export async function registerRiskRoutes(
  app: AppInstance,
  authService: AuthService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get(
    '/api/v1/risk-profiles',
    { preHandler: requireAuth, schema: { tags: ['risk'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return { profiles: [getDefaultRiskProfile()] };
    },
  );

  app.post(
    '/api/v1/system/kill-switch',
    { preHandler: requireAuth, schema: { tags: ['system'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return { enabled: true, mode: 'HALTED', message: 'Kill switch activado' };
    },
  );
}
