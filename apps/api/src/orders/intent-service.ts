import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@chivo/database';
import { RiskManager } from '../risk/risk-manager';

export class OrderIntentService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly riskManager: RiskManager,
  ) {}

  async createIntent(input: {
    accountId: string;
    executionMode: 'PAPER' | 'LIVE';
    controlMode: 'MANUAL' | 'AUTO';
    instrumentId: string;
    side: string;
    positionSide: string;
    type: string;
    quantity: string;
    limitPrice?: string;
    stopPrice?: string;
    reduceOnly?: boolean;
    idempotencyKey?: string;
    correlationId?: string;
  }) {
    const check = this.riskManager.check({
      accountId: input.accountId,
      executionMode: input.executionMode,
      controlMode: input.controlMode,
      instrumentId: input.instrumentId,
      side: input.side,
      positionSide: input.positionSide,
      quantity: input.quantity,
    });
    if (!check.approved) {
      throw new Error('ORDER_RISK_REJECTED');
    }

    const intentId = randomUUID();
    const idempotencyKey = input.idempotencyKey ?? `intent:${intentId}`;
    const correlationId = input.correlationId ?? randomUUID();

    const intent = await this.prisma.orderIntent.create({
      data: {
        intentId,
        idempotencyKey,
        accountId: input.accountId,
        correlationId,
        executionMode: input.executionMode,
        controlMode: input.controlMode,
        instrumentId: input.instrumentId,
        side: input.side,
        positionSide: input.positionSide,
        type: input.type,
        quantity: input.quantity,
        limitPrice: input.limitPrice ?? null,
        stopPrice: input.stopPrice ?? null,
        reduceOnly: input.reduceOnly ?? false,
        state: 'RISK_APPROVED',
      },
    });

    await this.prisma.orderIntent.update({
      where: { intentId: intent.intentId },
      data: { state: 'SUBMITTED' },
    });

    return { intentId: intent.intentId, state: 'SUBMITTED', correlationId };
  }
}
