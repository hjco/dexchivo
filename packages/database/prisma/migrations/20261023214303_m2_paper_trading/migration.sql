-- CreateTable
CREATE TABLE "paper_accounts" (
    "accountId" UUID NOT NULL,
    "executionMode" VARCHAR(8) NOT NULL DEFAULT 'PAPER',
    "baseCurrency" VARCHAR(8) NOT NULL DEFAULT 'USDT',
    "cashBalance" DECIMAL(30,12) NOT NULL,
    "marginUsed" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "unrealizedPnl" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "realizedPnl" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "equity" DECIMAL(30,12) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_accounts_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "order_intents" (
    "intentId" UUID NOT NULL,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "accountId" UUID NOT NULL,
    "correlationId" UUID NOT NULL,
    "executionMode" VARCHAR(8) NOT NULL,
    "controlMode" VARCHAR(8) NOT NULL,
    "instrumentId" VARCHAR(96) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "positionSide" VARCHAR(4) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "timeInForce" VARCHAR(4),
    "quantity" DECIMAL(30,12) NOT NULL,
    "limitPrice" DECIMAL(30,12),
    "stopPrice" DECIMAL(30,12),
    "stopLoss" DECIMAL(30,12),
    "takeProfit" DECIMAL(30,12),
    "reduceOnly" BOOLEAN NOT NULL,
    "state" VARCHAR(24) NOT NULL,
    "signalId" UUID,
    "strategyId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_intents_pkey" PRIMARY KEY ("intentId")
);

-- CreateTable
CREATE TABLE "orders" (
    "orderId" UUID NOT NULL,
    "intentId" UUID,
    "accountId" UUID NOT NULL,
    "instrumentId" VARCHAR(96) NOT NULL,
    "executionMode" VARCHAR(8) NOT NULL,
    "controlMode" VARCHAR(8) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "positionSide" VARCHAR(4) NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "timeInForce" VARCHAR(4),
    "quantity" DECIMAL(30,12) NOT NULL,
    "limitPrice" DECIMAL(30,12),
    "stopPrice" DECIMAL(30,12),
    "filledQuantity" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "remainingQuantity" DECIMAL(30,12) NOT NULL,
    "avgFillPrice" DECIMAL(30,12),
    "status" VARCHAR(16) NOT NULL,
    "reduceOnly" BOOLEAN NOT NULL,
    "clientOrderId" VARCHAR(128),
    "venueOrderId" VARCHAR(128),
    "rejectReason" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "fills" (
    "fillId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "venueFillId" VARCHAR(128),
    "instrumentId" VARCHAR(96) NOT NULL,
    "executionMode" VARCHAR(8) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "positionSide" VARCHAR(4) NOT NULL,
    "price" DECIMAL(30,12) NOT NULL,
    "quantity" DECIMAL(30,12) NOT NULL,
    "fee" DECIMAL(30,12) NOT NULL,
    "feeAsset" VARCHAR(16) NOT NULL,
    "liquidity" VARCHAR(8) NOT NULL,
    "filledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fills_pkey" PRIMARY KEY ("fillId")
);

-- CreateTable
CREATE TABLE "positions" (
    "positionId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "instrumentId" VARCHAR(96) NOT NULL,
    "executionMode" VARCHAR(8) NOT NULL,
    "side" VARCHAR(4) NOT NULL,
    "quantity" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "entryPrice" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "markPrice" DECIMAL(30,12),
    "unrealizedPnl" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "realizedPnl" DECIMAL(30,12) NOT NULL DEFAULT 0,
    "leverage" DECIMAL(30,12) NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("positionId")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "entryId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "type" VARCHAR(24) NOT NULL,
    "asset" VARCHAR(16) NOT NULL,
    "amount" DECIMAL(30,12) NOT NULL,
    "balanceAfter" DECIMAL(30,12) NOT NULL,
    "referenceType" VARCHAR(32),
    "referenceId" VARCHAR(128),
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("entryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_intents_idempotencyKey_key" ON "order_intents"("idempotencyKey");

-- CreateIndex
CREATE INDEX "order_intents_accountId_state_idx" ON "order_intents"("accountId", "state");

-- CreateIndex
CREATE INDEX "order_intents_instrumentId_idx" ON "order_intents"("instrumentId");

-- CreateIndex
CREATE INDEX "orders_accountId_status_idx" ON "orders"("accountId", "status");

-- CreateIndex
CREATE INDEX "orders_instrumentId_idx" ON "orders"("instrumentId");

-- CreateIndex
CREATE INDEX "fills_orderId_idx" ON "fills"("orderId");

-- CreateIndex
CREATE INDEX "fills_instrumentId_idx" ON "fills"("instrumentId");

-- CreateIndex
CREATE INDEX "positions_accountId_idx" ON "positions"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "positions_accountId_instrumentId_side_executionMode_key" ON "positions"("accountId", "instrumentId", "side", "executionMode");

-- CreateIndex
CREATE INDEX "ledger_entries_accountId_occurredAt_idx" ON "ledger_entries"("accountId", "occurredAt");

-- AddForeignKey
ALTER TABLE "order_intents" ADD CONSTRAINT "order_intents_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "paper_accounts"("accountId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "paper_accounts"("accountId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_intentId_fkey" FOREIGN KEY ("intentId") REFERENCES "order_intents"("intentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fills" ADD CONSTRAINT "fills_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("orderId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "paper_accounts"("accountId") ON DELETE CASCADE ON UPDATE CASCADE;
