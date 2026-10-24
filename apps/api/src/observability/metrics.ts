export interface Metrics {
  streamLag: number;
  quoteAgeMs: number;
  consumerLag: number;
  rejectedRiskChecks: number;
  orderReconciliationBacklog: number;
  unknownOrderState: number;
  apiErrors: number;
}

export function getMetrics(): Metrics {
  return {
    streamLag: 0,
    quoteAgeMs: 0,
    consumerLag: 0,
    rejectedRiskChecks: 0,
    orderReconciliationBacklog: 0,
    unknownOrderState: 0,
    apiErrors: 0,
  };
}
