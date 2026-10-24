import type { PrismaClient } from '@chivo/database';
import { randomUUID } from 'node:crypto';

import { type PaperRepository } from './paper-repository';

export class PaperService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repo: PaperRepository,
  ) {}

  async getPortfolio() {
    const account = await this.repo.getPaperAccount();
    const positions = await this.repo.listPositions(account.accountId);
    return {
      account: {
        accountId: account.accountId,
        cashBalance: account.cashBalance.toString(),
        marginUsed: account.marginUsed.toString(),
        unrealizedPnl: account.unrealizedPnl.toString(),
        realizedPnl: account.realizedPnl.toString(),
        equity: account.equity.toString(),
        updatedAt: account.updatedAt.toISOString(),
      },
      positions: positions.map((p) => ({
        positionId: p.positionId,
        accountId: p.accountId,
        instrumentId: p.instrumentId,
        executionMode: p.executionMode,
        side: p.side,
        quantity: p.quantity.toString(),
        entryPrice: p.entryPrice.toString(),
        markPrice: p.markPrice?.toString(),
        unrealizedPnl: p.unrealizedPnl.toString(),
        realizedPnl: p.realizedPnl.toString(),
        leverage: p.leverage.toString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async createOrder(input: {
    instrumentId: string;
    side: string;
    positionSide: string;
    type: string;
    quantity: string;
    limitPrice?: string;
    stopPrice?: string;
    reduceOnly?: boolean;
  }) {
    const account = await this.repo.getPaperAccount();
    const now = new Date();
    const orderId = randomUUID();
    const intentId = randomUUID();
    const correlationId = randomUUID();
    const quantity = input.quantity;

    const intent = await this.prisma.orderIntent.create({
      data: {
        intentId,
        idempotencyKey: `paper:manual:${orderId}`,
        accountId: account.accountId,
        correlationId,
        executionMode: 'PAPER',
        controlMode: 'MANUAL',
        instrumentId: input.instrumentId,
        side: input.side,
        positionSide: input.positionSide,
        type: input.type,
        quantity,
        limitPrice: input.limitPrice ?? null,
        stopPrice: input.stopPrice ?? null,
        reduceOnly: input.reduceOnly ?? false,
        state: 'CREATED',
      },
    });

    await this.prisma.orderIntent.update({
      where: { intentId: intent.intentId },
      data: { state: 'RISK_APPROVED' },
    });

    const order = await this.prisma.order.create({
      data: {
        orderId,
        intentId: intent.intentId,
        accountId: account.accountId,
        instrumentId: input.instrumentId,
        executionMode: 'PAPER',
        controlMode: 'MANUAL',
        side: input.side,
        positionSide: input.positionSide,
        type: input.type,
        quantity,
        limitPrice: input.limitPrice ?? null,
        stopPrice: input.stopPrice ?? null,
        filledQuantity: '0',
        remainingQuantity: quantity,
        status: 'NEW',
        reduceOnly: input.reduceOnly ?? false,
        clientOrderId: orderId,
        updatedAt: now,
      },
    });

    await this.prisma.orderIntent.update({
      where: { intentId: intent.intentId },
      data: { state: 'SUBMITTED' },
    });

    return {
      orderId: order.orderId,
      status: order.status,
      state: 'SUBMITTED',
    };
  }

  async listOrders(limit = 50) {
    const account = await this.repo.getPaperAccount();
    const orders = await this.repo.listOrders(account.accountId, limit);
    return orders.map((o) => ({
      orderId: o.orderId,
      accountId: o.accountId,
      instrumentId: o.instrumentId,
      executionMode: o.executionMode,
      side: o.side,
      positionSide: o.positionSide,
      type: o.type,
      quantity: o.quantity.toString(),
      filledQuantity: o.filledQuantity.toString(),
      remainingQuantity: o.remainingQuantity.toString(),
      status: o.status,
      reduceOnly: o.reduceOnly,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  async listFills(limit = 100) {
    const account = await this.repo.getPaperAccount();
    const fills = await this.repo.listFills(account.accountId, limit);
    return fills.map((f) => ({
      fillId: f.fillId,
      orderId: f.orderId,
      instrumentId: f.instrumentId,
      side: f.side,
      price: f.price.toString(),
      quantity: f.quantity.toString(),
      fee: f.fee.toString(),
      feeAsset: f.feeAsset,
      filledAt: f.filledAt.toISOString(),
    }));
  }

  async listLedger(limit = 100) {
    const account = await this.repo.getPaperAccount();
    const entries = await this.repo.listLedger(account.accountId, limit);
    return entries.map((e) => ({
      entryId: e.entryId,
      type: e.type,
      asset: e.asset,
      amount: e.amount.toString(),
      balanceAfter: e.balanceAfter.toString(),
      occurredAt: e.occurredAt.toISOString(),
    }));
  }
}
