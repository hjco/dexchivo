import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

export interface PrismaConnectionOptions {
  connectionString: string;
  maxConnections?: number;
}

/**
 * Prisma 7 requires an explicit driver adapter. The adapter owns the pg pool;
 * PrismaClient remains the unit-of-work and transaction API.
 */
export function createPrismaClient(options: PrismaConnectionOptions): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: options.connectionString,
    ...(options.maxConnections === undefined ? {} : { max: options.maxConnections }),
  });

  return new PrismaClient({ adapter });
}

export type { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';
