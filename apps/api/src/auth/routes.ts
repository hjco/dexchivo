import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppInstance } from '../app';
import type { AppConfig } from '../config';
import type { AuthService } from './auth-service';
import { createAuthGuard, currentAuthContext } from './guard';
import { clearSessionCookie, readSessionToken, setSessionCookie } from './session-cookie';
import { AuthError } from './types';

function errorResponse(
  request: FastifyRequest,
  code: string,
  message: string,
  retryAfterSeconds?: number,
) {
  return {
    error: {
      code,
      message,
      requestId: request.id,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  };
}

function sendAuthError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: AuthError,
): FastifyReply {
  if (error.retryAfterSeconds !== undefined) {
    reply.header('retry-after', String(error.retryAfterSeconds));
  }
  return reply
    .code(error.statusCode)
    .send(errorResponse(request, error.code, error.message, error.retryAfterSeconds));
}

export async function registerAuthRoutes(
  app: AppInstance,
  config: AppConfig,
  authService: AuthService,
): Promise<void> {
  const requireAuth = createAuthGuard(authService);

  app.post('/api/v1/auth/login', async (request: any, reply: FastifyReply) => {
    try {
      const result = await authService.login({
        email: request.body?.email,
        password: request.body?.password,
        ...(request.body?.totpCode === undefined ? {} : { totpCode: request.body.totpCode }),
        ipAddress: request.ip,
        ...(request.headers['user-agent'] === undefined
          ? {}
          : { userAgent: request.headers['user-agent'] }),
      });

      setSessionCookie(reply, result.token, result.expiresAt, config.sessionCookieSecure);
      reply.header('cache-control', 'no-store');
      return { user: result.user, expiresAt: result.expiresAt.toISOString() };
    } catch (error) {
      if (error instanceof AuthError) {
        return sendAuthError(request, reply, error);
      }
      throw error;
    }
  });

  app.post('/api/v1/auth/logout', async (request: any, reply: FastifyReply) => {
    const token = readSessionToken(request);
    await authService.logout(token, {
      ipAddress: request.ip,
      ...(request.headers['user-agent'] === undefined
        ? {}
        : { userAgent: request.headers['user-agent'] }),
    });
    clearSessionCookie(reply, config.sessionCookieSecure);
    reply.header('cache-control', 'no-store');
    return reply.code(204).send();
  });

  app.get('/api/v1/me', { preHandler: requireAuth }, async (request: any, reply: FastifyReply) => {
    const context = currentAuthContext(request, reply);
    if (!context) {
      return;
    }
    reply.header('cache-control', 'no-store');
    return { user: context.user, twoFactorAvailable: true };
  });
}
