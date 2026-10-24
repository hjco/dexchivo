import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastify from 'fastify';

import type { AppConfig } from './config';
import { registerAuthRoutes } from './auth/routes';
import { registerMarketRoutes } from './market/routes';
import { registerHealthRoutes } from './routes/health';
import { registerSystemRoutes } from './routes/system';
import { registerObservabilityRoutes } from './routes/observability';
import { registerTelegramRoutes } from './routes/telegram';
import { registerAuditRoutes } from './routes/audit';
import type { AppServices } from './services';
import { securityHeaders } from './middleware/security';

export type AppInstance = ReturnType<typeof buildApp>;

export interface BuildAppOptions {
  config: AppConfig;
  services: AppServices;
  logger?: boolean | Parameters<typeof fastify>[0]['logger'];
}

export async function buildApp(options: BuildAppOptions) {
  const app = fastify({
    logger: options.logger ?? true,
    genReqId: () => crypto.randomUUID(),
  });

  app.addHook('onRequest', securityHeaders);

  await app.register(fastifyCors, {
    origin: options.config.dashboardOrigin,
    credentials: true,
  });

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Chivo Trading Platform API',
        description: 'API for the Chivo crypto trading platform.',
        version: options.config.version,
      },
      tags: [
        { name: 'health' },
        { name: 'system' },
        { name: 'auth' },
        { name: 'markets' },
        { name: 'telegram' },
        { name: 'audit' },
        { name: 'metrics' },
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'chivo_session',
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  await registerHealthRoutes(app, options.config, options.services.readiness);
  await registerSystemRoutes(app, options.config);
  await registerAuthRoutes(app, options.config, options.services.authService);
  await registerMarketRoutes(app, options.services.authService, options.services.marketService);
  await registerObservabilityRoutes(app);
  await registerTelegramRoutes(app, options.services.authService);
  await registerAuditRoutes(app, options.services.authService);

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
        requestId: request.id,
      },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'unhandled error');
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    return reply.code(statusCode).send({
      error: {
        code: statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : (error as { code?: string }).code ?? 'INTERNAL_SERVER_ERROR',
        message: statusCode === 500 ? 'Error interno del servidor' : (error as Error).message,
        requestId: request.id,
      },
    });
  });

  return app;
}
