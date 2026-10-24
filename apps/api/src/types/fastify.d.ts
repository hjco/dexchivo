import type { AuthenticatedContext } from '../auth/types';

declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthenticatedContext | null;
  }
}
