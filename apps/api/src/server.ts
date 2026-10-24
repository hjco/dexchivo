import { buildApp } from './app';
import { loadConfig } from './config';
import { createPrismaClient } from '@chivo/database';
import { createServices } from './services';

async function main() {
  const config = loadConfig();
  const prisma = createPrismaClient(config.databaseUrl);

  const services = createServices({
    config,
    prisma,
    redisUrl: config.redisUrl,
  });

  const app = await buildApp({
    config,
    services,
  });

  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info({ port: config.port }, 'chivo-api listening');
  } catch (error) {
    app.log.error({ err: error }, 'failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
}

void main();
