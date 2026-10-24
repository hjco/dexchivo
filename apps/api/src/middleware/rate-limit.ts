import type { FastifyReply, FastifyRequest } from 'fastify';

interface Entry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: { max: number; windowMs: number }) {
  const store = new Map<string, Entry>();
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `${request.ip}:${request.routerPath ?? request.url}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + opts.windowMs });
      return;
    }
    if (entry.count >= opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('retry-after', String(retryAfter));
      return reply.code(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Demasiadas solicitudes',
          requestId: request.id,
          retryAfterSeconds: retryAfter,
        },
      });
    }
    entry.count++;
  };
}
