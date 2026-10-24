import type { RiskProfile, RiskCheckResult } from '@chivo/contracts';

export interface OrderIntentInput {
  accountId: string;
  executionMode: 'PAPER' | 'LIVE';
  controlMode: 'MANUAL' | 'AUTO';
  instrumentId: string;
  side: string;
  positionSide: string;
  quantity: string;
  limitPrice?: string;
  stopPrice?: string;
  reduceOnly?: boolean;
}

export class RiskManager {
  constructor(private readonly defaultProfile: RiskProfile) {}

  check(input: OrderIntentInput): RiskCheckResult {
    const reasons: string[] = [];
    const quantity = Number(input.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      reasons.push('Cantidad inválida');
    }
    if (input.executionMode === 'LIVE') {
      reasons.push('Operación LIVE deshabilitada');
    }
    if (reasons.length > 0) {
      return { approved: false, reasons, profileId: this.defaultProfile.profileId };
    }
    return {
      approved: true,
      reasons: ['Aprobado por gestor de riesgo'],
      profileId: this.defaultProfile.profileId,
      limits: this.defaultProfile.limits,
    };
  }
}

export function getDefaultRiskProfile(): RiskProfile {
  return {
    profileId: 'default-paper',
    name: 'Paper por defecto',
    executionMode: 'PAPER',
    limits: {
      maxOrderNotionalUsd: '10000',
      maxDailyNotionalUsd: '50000',
      maxOpenPositions: 10,
      maxLeverage: 3,
      allowedSides: ['BUY', 'SELL'],
      allowedOrderTypes: ['MARKET', 'LIMIT'],
    },
    enabled: true,
  };
}
