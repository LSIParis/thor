-- CreateTable
CREATE TABLE "M365Tenant" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenantId" TEXT,
    "displayName" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "M365Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "M365Domain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "M365Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "M365Account" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "userPrincipalName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "licensed" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "M365Account_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "M365Tenant" ADD CONSTRAINT "M365Tenant_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "M365Domain" ADD CONSTRAINT "M365Domain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "M365Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "M365Account" ADD CONSTRAINT "M365Account_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "M365Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
