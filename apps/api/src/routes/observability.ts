import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AppInstance } from '../app';
import { getMetrics } from '../observability/metrics';

export async function registerObservabilityRoutes(app: AppInstance): Promise<void> {
  app.get('/api/v1/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('cache-control', 'no-store');
    return getMetrics();
  });
}
