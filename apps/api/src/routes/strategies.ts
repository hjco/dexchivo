import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';

export async function registerStrategyRoutes(
  app: AppInstance,
  authService: AuthService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get(
    '/api/v1/strategies',
    { preHandler: requireAuth, schema: { tags: ['strategies'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return {
        strategies: [
          {
            strategyId: 'fvg_choch_v1',
            version: '1.0.0',
            status: 'ENABLED',
            executionMode: 'PAPER',
            description: 'FVG/CHoCH/BOS con validación en velas cerradas',
          },
        ],
      };
    },
  );
}
