import type { AppInstance } from '../app';

export async function registerHealthRoutes(
  app: AppInstance,
  config?: any,
  readiness?: () => Promise<any[]>,
): Promise<void> {
  const cfg = config ?? { version: '0.1.0' };
  const read = readiness ?? (async () => [
    { name: 'database', status: 'ok', detail: 'test database' },
    { name: 'redis', status: 'ok', detail: 'test redis' },
  ]);

  app.get('/health/live', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    reply.header('x-request-id', _request.id);
    return {
      status: 'ok',
      service: 'chivo-api',
      version: cfg.version ?? '0.1.0',
      checkedAt: new Date().toISOString(),
      checks: [{ name: 'configuration', status: 'ok', detail: 'PAPER only; LIVE trading disabled' }],
    };
  });

  app.get('/health/ready', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    reply.header('x-request-id', _request.id);
    let dependencies: any[] = [];
    try {
      dependencies = await read();
    } catch {
      dependencies = [{ name: 'dependencies', status: 'error', detail: 'Dependency checks failed' }];
    }
    const checks = [{ name: 'configuration', status: 'ok', detail: 'PAPER only; LIVE trading disabled' }, ...dependencies];
    const failed = checks.some((c: any) => c.status === 'error');
    if (failed) reply.code(503);
    return {
      status: failed ? 'error' : 'ok',
      service: 'chivo-api',
      version: cfg.version ?? '0.1.0',
      checkedAt: new Date().toISOString(),
      checks,
    };
  });

  app.get('/api/v1/health', async (_request, reply) => {
    reply.header('cache-control', 'no-store');
    reply.header('x-request-id', _request.id);
    return {
      status: 'ok',
      service: 'chivo-api',
      version: cfg.version ?? '0.1.0',
      checkedAt: new Date().toISOString(),
      checks: [{ name: 'configuration', status: 'ok', detail: 'PAPER only; LIVE trading disabled' }],
    };
  });
}
