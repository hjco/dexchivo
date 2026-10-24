-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "totpSecret" VARCHAR(1024),
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "actor" VARCHAR(320) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "targetType" VARCHAR(80),
    "targetId" VARCHAR(128),
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(512),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruments" (
    "instrumentId" VARCHAR(96) NOT NULL,
    "exchange" VARCHAR(32) NOT NULL,
    "marketType" VARCHAR(32) NOT NULL,
    "venueSymbol" VARCHAR(64) NOT NULL,
    "baseAsset" VARCHAR(32) NOT NULL,
    "quoteAsset" VARCHAR(32) NOT NULL,
    "settleAsset" VARCHAR(32),
    "status" VARCHAR(16) NOT NULL,
    "tickSize" DECIMAL(30,12) NOT NULL,
    "stepSize" DECIMAL(30,12) NOT NULL,
    "minNotional" DECIMAL(30,12),
    "contractMultiplier" DECIMAL(30,12) NOT NULL,
    "quantityUnit" VARCHAR(16) NOT NULL,
    "pricePrecision" INTEGER NOT NULL,
    "quantityPrecision" INTEGER NOT NULL,
    "maxLeverage" DECIMAL(30,12),
    "capabilities" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("instrumentId")
);

-- CreateTable
CREATE TABLE "candles" (
    "id" UUID NOT NULL,
    "instrumentId" VARCHAR(96) NOT NULL,
    "timeframe" VARCHAR(8) NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "closeTime" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(30,12) NOT NULL,
    "high" DECIMAL(30,12) NOT NULL,
    "low" DECIMAL(30,12) NOT NULL,
    "close" DECIMAL(30,12) NOT NULL,
    "volume" DECIMAL(30,12) NOT NULL,
    "isClosed" BOOLEAN NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "instruments_baseAsset_quoteAsset_idx" ON "instruments"("baseAsset", "quoteAsset");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_exchange_venueSymbol_key" ON "instruments"("exchange", "venueSymbol");

-- CreateIndex
CREATE INDEX "candles_instrumentId_timeframe_closeTime_idx" ON "candles"("instrumentId", "timeframe", "closeTime");

-- CreateIndex
CREATE UNIQUE INDEX "candles_instrumentId_timeframe_openTime_key" ON "candles"("instrumentId", "timeframe", "openTime");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candles" ADD CONSTRAINT "candles_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("instrumentId") ON DELETE CASCADE ON UPDATE CASCADE;
