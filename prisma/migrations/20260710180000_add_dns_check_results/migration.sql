-- CreateTable
CREATE TABLE "DnsCheckResult" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spfValid" BOOLEAN NOT NULL,
    "dmarcValid" BOOLEAN NOT NULL,
    "dkimFound" BOOLEAN NOT NULL,
    "blacklistClean" BOOLEAN NOT NULL,
    "globalStatus" TEXT NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "DnsCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DnsCheckResult_zoneId_idx" ON "DnsCheckResult"("zoneId");

-- CreateIndex
CREATE INDEX "DnsCheckResult_checkedAt_idx" ON "DnsCheckResult"("checkedAt");

-- AddForeignKey
ALTER TABLE "DnsCheckResult" ADD CONSTRAINT "DnsCheckResult_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "DnsZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
