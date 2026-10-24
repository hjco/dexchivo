import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppConfig } from '../config';
import type { AppInstance } from '../app';
import { setKillSwitch } from '../middleware/kill-switch';

export async function registerSystemRoutes(app: AppInstance, config: AppConfig): Promise<void> {
  app.get('/api/v1/system/info', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store');
    return {
      service: 'chivo-api',
      version: config.version,
      executionMode: config.executionMode,
      liveTradingEnabled: config.liveTradingEnabled,
      environment: config.nodeEnv,
    };
  });

  app.post('/api/v1/system/kill-switch', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store');
    const body = request.body as { enabled?: boolean } | undefined;
    setKillSwitch(body?.enabled === true);
    return { enabled: body?.enabled === true };
  });
}
