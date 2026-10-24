import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { assertAdminPassword, hashPassword } from '@chivo/security';

import { createPrismaClient } from '../src/client';

const rootEnvFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) {
  process.loadEnvFile(rootEnvFile);
}

const databaseUrl = process.env['DATABASE_URL']?.trim();
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database');
}

const email = (process.env['ADMIN_EMAIL']?.trim() || 'admin@chivo.local').toLowerCase();
const password = process.env['ADMIN_PASSWORD'] ?? '';
const displayName = process.env['ADMIN_DISPLAY_NAME']?.trim() || 'Administrador';

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('ADMIN_EMAIL must be a valid email address');
}
if (!password) {
  throw new Error(
    'ADMIN_PASSWORD is required. Set a strong password in your ignored .env file before seeding.',
  );
}
assertAdminPassword(password);

const prisma = createPrismaClient({ connectionString: databaseUrl });

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.info(`[db:seed] admin already exists: ${email} (no changes)`);
  } else {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        displayName: displayName.slice(0, 120),
        passwordHash,
      },
    });
    console.info(`[db:seed] admin created: ${email}`);
  }
} finally {
  await prisma.$disconnect();
}

const existingAccount = await prisma.paperAccount.findFirst({
  where: { executionMode: 'PAPER' },
});
if (existingAccount) {
  console.info(`[db:seed] paper account already exists: ${existingAccount.accountId}`);
} else {
  const accountId = 'e3f8b902-7c62-4ab1-8d42-92e756dc8134';
  await prisma.paperAccount.create({
    data: {
      accountId,
      executionMode: 'PAPER',
      baseCurrency: 'USDT',
      cashBalance: '10000.000000000000',
      marginUsed: '0.000000000000',
      unrealizedPnl: '0.000000000000',
      realizedPnl: '0.000000000000',
      equity: '10000.000000000000',
    },
  });
  await prisma.ledgerEntry.create({
    data: {
      entryId: 'b92a7645-dc81-4f73-8e27-1ab65c943f72',
      accountId,
      type: 'CASH_DEPOSIT',
      asset: 'USDT',
      amount: '10000.000000000000',
      balanceAfter: '10000.000000000000',
      referenceType: 'SEED',
      referenceId: 'M2_INIT',
      occurredAt: new Date(),
    },
  });
  console.info(`[db:seed] paper account created: ${accountId}`);
}
