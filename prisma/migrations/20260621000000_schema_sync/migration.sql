-- ── Role enum : ajouter CLIENT ───────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE 'CLIENT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── User : colonnes auth / vérification ──────────────────────────────────────
ALTER TABLE "User"
  ADD COLUMN "emailVerified"           BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "verificationToken"       TEXT,
  ADD COLUMN "verificationTokenExpiry" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken"      TEXT,
  ADD COLUMN "passwordResetExpiry"     TIMESTAMP(3);

CREATE UNIQUE INDEX "User_verificationToken_key"  ON "User"("verificationToken");
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- ── Client : colonnes supplémentaires ────────────────────────────────────────
ALTER TABLE "Client"
  ADD COLUMN "logoPath"      TEXT,
  ADD COLUMN "isHistorical"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noSync"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cometUsername" TEXT,
  ADD COLUMN "cometPassword" TEXT,
  ADD COLUMN "billingPeriod" TEXT    NOT NULL DEFAULT 'monthly';

-- ── Site : nouvelle table ─────────────────────────────────────────────────────
CREATE TABLE "Site" (
  "id"             TEXT NOT NULL,
  "clientId"       TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "address"        TEXT,
  "city"           TEXT,
  "postalCode"     TEXT,
  "country"        TEXT DEFAULT 'France',
  "phone"          TEXT,
  "email"          TEXT,
  "digicode1"      TEXT,
  "digicode2"      TEXT,
  "interphone"     TEXT,
  "etage"          TEXT,
  "heureOuverture" TEXT,
  "heureFermeture" TEXT,
  "isHeadquarters" BOOLEAN      NOT NULL DEFAULT false,
  "isDefault"      BOOLEAN      NOT NULL DEFAULT false,
  "noSync"         BOOLEAN      NOT NULL DEFAULT false,
  "notes"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Contact : colonnes supplémentaires + FK Site ──────────────────────────────
ALTER TABLE "Contact"
  ADD COLUMN "siteId"      TEXT,
  ADD COLUMN "isHistorical" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "noSync"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "visible"     BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Equipment : colonnes supplémentaires + FK Site ────────────────────────────
ALTER TABLE "Equipment"
  ADD COLUMN "siteId"     TEXT,
  ADD COLUMN "noSync"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rmmAgentId" TEXT;

CREATE UNIQUE INDEX "Equipment_rmmAgentId_key" ON "Equipment"("rmmAgentId");

ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── PersonnelMovement : nouvelle table ───────────────────────────────────────
CREATE TABLE "PersonnelMovement" (
  "id"               TEXT NOT NULL,
  "clientId"         TEXT NOT NULL,
  "type"             TEXT NOT NULL,
  "entryType"        TEXT,
  "internshipMonths" INTEGER,
  "firstName"        TEXT NOT NULL,
  "lastName"         TEXT NOT NULL,
  "role"             TEXT,
  "mobile"           TEXT,
  "email"            TEXT,
  "accessVPN"        BOOLEAN      NOT NULL DEFAULT false,
  "accessServer"     BOOLEAN      NOT NULL DEFAULT false,
  "status"           TEXT         NOT NULL DEFAULT 'EN_ATTENTE',
  "date"             TIMESTAMP(3) NOT NULL,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonnelMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PersonnelMovement" ADD CONSTRAINT "PersonnelMovement_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Registrar : nouvelle table ────────────────────────────────────────────────
CREATE TABLE "Registrar" (
  "id"        TEXT NOT NULL,
  "clientId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Registrar_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Registrar" ADD CONSTRAINT "Registrar_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── DnsZone : restructuration clientId+registrar(txt) → registrarId+source+ovhZoneName
-- Supprimer l'ancienne FK vers Client
ALTER TABLE "DnsZone" DROP CONSTRAINT "DnsZone_clientId_fkey";
-- Supprimer les anciennes colonnes
ALTER TABLE "DnsZone" DROP COLUMN "clientId";
ALTER TABLE "DnsZone" DROP COLUMN "registrar";
-- Ajouter les nouvelles colonnes
ALTER TABLE "DnsZone"
  ADD COLUMN "registrarId" TEXT,
  ADD COLUMN "source"      TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "ovhZoneName" TEXT;
-- Passer registrarId NOT NULL (base vide, sans données)
ALTER TABLE "DnsZone" ALTER COLUMN "registrarId" SET NOT NULL;
-- Contrainte unique composite
ALTER TABLE "DnsZone" ADD CONSTRAINT "DnsZone_ovhZoneName_registrarId_key"
  UNIQUE ("ovhZoneName", "registrarId");
-- FK vers Registrar
ALTER TABLE "DnsZone" ADD CONSTRAINT "DnsZone_registrarId_fkey"
  FOREIGN KEY ("registrarId") REFERENCES "Registrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RegistrarConfig : nouvelle table ─────────────────────────────────────────
CREATE TABLE "RegistrarConfig" (
  "id"         TEXT NOT NULL,
  "clientId"   TEXT NOT NULL,
  "provider"   TEXT NOT NULL,
  "login"      TEXT,
  "apiKey"     TEXT,
  "apiSecret"  TEXT,
  "apiToken"   TEXT,
  "extra"      TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrarConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrarConfig_clientId_provider_key"
  ON "RegistrarConfig"("clientId", "provider");

ALTER TABLE "RegistrarConfig" ADD CONSTRAINT "RegistrarConfig_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── M365Tenant : colonnes supplémentaires ────────────────────────────────────
ALTER TABLE "M365Tenant"
  ADD COLUMN "azureClientId"     TEXT,
  ADD COLUMN "azureClientSecret" TEXT,
  ADD COLUMN "lastSyncAt"        TIMESTAMP(3);

-- ── M365LicenseSku : nouvelle table ──────────────────────────────────────────
CREATE TABLE "M365LicenseSku" (
  "id"            TEXT NOT NULL,
  "tenantId"      TEXT NOT NULL,
  "skuId"         TEXT NOT NULL,
  "skuPartNumber" TEXT NOT NULL,
  "consumed"      INTEGER NOT NULL DEFAULT 0,
  "total"         INTEGER NOT NULL DEFAULT 0,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "M365LicenseSku_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "M365LicenseSku_tenantId_skuId_key"
  ON "M365LicenseSku"("tenantId", "skuId");

ALTER TABLE "M365LicenseSku" ADD CONSTRAINT "M365LicenseSku_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "M365Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── M365Account : colonnes supplémentaires + contrainte unique ────────────────
ALTER TABLE "M365Account"
  ADD COLUMN "graphId"        TEXT,
  ADD COLUMN "licenseType"    TEXT,
  ADD COLUMN "licenseExpiry"  TIMESTAMP(3),
  ADD COLUMN "accountEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "m365CreatedAt"  TIMESTAMP(3);

CREATE UNIQUE INDEX "M365Account_tenantId_userPrincipalName_key"
  ON "M365Account"("tenantId", "userPrincipalName");
