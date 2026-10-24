import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import { TelegramService } from '../telegram/service';

const telegram = new TelegramService();

export async function registerTelegramRoutes(app: AppInstance, authService: AuthService): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.post('/api/v1/telegram/link-token', { preHandler: requireAuth }, async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return telegram.createLinkToken();
  });

  app.post('/api/v1/telegram/link', { preHandler: requireAuth }, async (request, reply) => {
    reply.header('cache-control', 'no-store');
    return telegram.linkChat((request.body as any)?.chatId);
  });

  app.get('/api/v1/telegram/status', { preHandler: requireAuth }, async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    return telegram.getStatus();
  });
}
