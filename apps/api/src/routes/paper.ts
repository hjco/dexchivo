import { z } from 'zod';

import type { AppInstance } from '../app';
import type { AuthService } from '../auth/auth-service';
import { createAuthGuard } from '../auth/guard';
import type { PaperService } from '../paper/paper-service';

const createOrderSchema = z.strictObject({
  instrumentId: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  positionSide: z.enum(['LONG', 'SHORT', 'BOTH']),
  type: z.enum(['MARKET', 'LIMIT']),
  quantity: z.string().min(1),
  limitPrice: z.string().optional(),
  stopPrice: z.string().optional(),
  reduceOnly: z.boolean().optional(),
});

export async function registerPaperRoutes(
  app: AppInstance,
  authService: AuthService,
  paperService: PaperService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.get(
    '/api/v1/portfolio',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return paperService.getPortfolio();
    },
  );

  app.get(
    '/api/v1/positions',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      const portfolio = await paperService.getPortfolio();
      return { positions: portfolio.positions };
    },
  );

  app.post(
    '/api/v1/orders',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['paper'],
        security: [{ cookieAuth: [] }],
        body: createOrderSchema,
      },
    },
    async (request, reply) => {
      try {
        const body = request.body;
        const result = await paperService.createOrder({
          instrumentId: body.instrumentId,
          side: body.side,
          positionSide: body.positionSide,
          type: body.type,
          quantity: body.quantity,
          ...(body.limitPrice === undefined ? {} : { limitPrice: body.limitPrice }),
          ...(body.stopPrice === undefined ? {} : { stopPrice: body.stopPrice }),
          ...(body.reduceOnly === undefined ? {} : { reduceOnly: body.reduceOnly }),
        });
        reply.header('cache-control', 'no-store');
        return reply.code(201).send(result);
      } catch {
        reply.code(400).send({
          error: {
            code: 'ORDER_REJECTED',
            message: 'No se pudo crear la orden paper',
            requestId: request.id,
          },
        });
      }
    },
  );

  app.get(
    '/api/v1/orders',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const limit = Number((request.query as Record<string, string>)?.limit ?? '50');
      return paperService.listOrders(Number.isNaN(limit) ? 50 : limit);
    },
  );

  app.post(
    '/api/v1/orders/:id/cancel',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (_request, reply) => {
      reply.header('cache-control', 'no-store');
      return reply.code(202).send({ status: 'CANCEL_PENDING' });
    },
  );

  app.get(
    '/api/v1/fills',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const limit = Number((request.query as Record<string, string>)?.limit ?? '100');
      return paperService.listFills(Number.isNaN(limit) ? 100 : limit);
    },
  );

  app.get(
    '/api/v1/ledger',
    { preHandler: requireAuth, schema: { tags: ['paper'], security: [{ cookieAuth: [] }] } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const limit = Number((request.query as Record<string, string>)?.limit ?? '100');
      return paperService.listLedger(Number.isNaN(limit) ? 100 : limit);
    },
  );
}
