import type { HealthCheck } from '@chivo/contracts';
import type { PrismaClient } from '@chivo/database';
import { createClient } from 'redis';

export interface ReadinessDependencies {
  prisma: PrismaClient;
  redisUrl: string;
}

async function checkRedis(redisUrl: string): Promise<HealthCheck> {
  const client = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: false,
    },
  });
  client.on('error', () => {
    // Connection failures are reported through the readiness result. Avoid an
    // unhandled EventEmitter error while keeping messages free of URLs.
  });

  try {
    await client.connect();
    const pong = await client.ping();
    return pong === 'PONG'
      ? { name: 'redis', status: 'ok', detail: 'Redis responded to PING' }
      : { name: 'redis', status: 'error', detail: 'Redis returned an unexpected response' };
  } catch {
    return { name: 'redis', status: 'error', detail: 'Redis is not reachable' };
  } finally {
    if (client.isOpen) {
      try {
        await client.quit();
      } catch {
        client.destroy();
      }
    }
  }
}

export function createReadinessCheck(
  dependencies: ReadinessDependencies,
): () => Promise<HealthCheck[]> {
  return async () => {
    const checks: HealthCheck[] = [];

    try {
      await dependencies.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: 'database', status: 'ok', detail: 'PostgreSQL query succeeded' });
    } catch {
      checks.push({ name: 'database', status: 'error', detail: 'PostgreSQL is not reachable' });
    }

    checks.push(await checkRedis(dependencies.redisUrl));
    return checks;
  };
}
