-- CreateTable
CREATE TABLE "VoipService" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoipService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoipEquipment" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoipEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoipTrunk" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "sipServer" TEXT,
    "sipUser" TEXT,
    "channels" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoipTrunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoipExtension" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT,
    "device" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoipExtension_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoipService" ADD CONSTRAINT "VoipService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoipEquipment" ADD CONSTRAINT "VoipEquipment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VoipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoipTrunk" ADD CONSTRAINT "VoipTrunk_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VoipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoipExtension" ADD CONSTRAINT "VoipExtension_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "VoipService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
