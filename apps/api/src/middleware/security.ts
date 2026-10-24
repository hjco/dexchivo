import type { FastifyReply, FastifyRequest } from 'fastify';

export async function securityHeaders(_request: FastifyRequest, reply: FastifyReply) {
  reply.header('x-content-type-options', 'nosniff');
  reply.header('x-frame-options', 'DENY');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('permissions-policy', 'geolocation=(), microphone=()');
}
