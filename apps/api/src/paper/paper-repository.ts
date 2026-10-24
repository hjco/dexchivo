import type { PrismaClient } from '@chivo/database';

export class PaperRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getPaperAccount() {
    const account = await this.prisma.paperAccount.findFirst({
      where: { executionMode: 'PAPER' },
    });
    if (!account) {
      throw new Error('No paper account configured');
    }
    return account;
  }

  async listPositions(accountId: string) {
    return this.prisma.position.findMany({
      where: { accountId, executionMode: 'PAPER' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async listOrders(accountId: string, limit = 50) {
    return this.prisma.order.findMany({
      where: { accountId, executionMode: 'PAPER' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async listFills(accountId: string, limit = 100) {
    return this.prisma.fill.findMany({
      where: { order: { accountId } },
      orderBy: { filledAt: 'desc' },
      take: limit,
      include: { order: true },
    });
  }

  async listLedger(accountId: string, limit = 100) {
    return this.prisma.ledgerEntry.findMany({
      where: { accountId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }
}
