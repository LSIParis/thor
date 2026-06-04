-- CreateTable
CREATE TABLE "NextcloudService" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextcloudService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextcloudServer" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "version" TEXT,
    "adminUser" TEXT,
    "storageTotal" TEXT,
    "userCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NextcloudServer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NextcloudService" ADD CONSTRAINT "NextcloudService_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextcloudServer" ADD CONSTRAINT "NextcloudServer_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "NextcloudService"("id") ON DELETE CASCADE ON UPDATE CASCADE;
