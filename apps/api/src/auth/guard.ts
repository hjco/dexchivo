import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthService } from './auth-service';
import { readSessionToken } from './session-cookie';
import type { AuthenticatedContext } from './types';

export function unauthorized(request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return reply.code(401).send({
    error: {
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
      requestId: request.id,
    },
  });
}

export function createAuthGuard(authService: AuthService) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const context = await authService.authenticate(readSessionToken(request));
    if (!context) {
      unauthorized(request, reply);
      return;
    }
    request.authContext = context;
  };
}

export function currentAuthContext(
  request: FastifyRequest,
  reply: FastifyReply,
): AuthenticatedContext | null {
  if (!request.authContext) {
    unauthorized(request, reply);
    return null;
  }
  return request.authContext;
}
