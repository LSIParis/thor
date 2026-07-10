-- Add clientId to DnsZone
ALTER TABLE "DnsZone" ADD COLUMN "clientId" TEXT;

-- Copy clientId from Registrar via join
UPDATE "DnsZone" dz
SET "clientId" = r."clientId"
FROM "Registrar" r
WHERE r."id" = dz."registrarId";

-- Make clientId NOT NULL
ALTER TABLE "DnsZone" ALTER COLUMN "clientId" SET NOT NULL;

-- Drop old unique index (ovhZoneName, registrarId)
DROP INDEX IF EXISTS "DnsZone_ovhZoneName_registrarId_key";

-- Drop FK from DnsZone to Registrar, then drop registrarId column
ALTER TABLE "DnsZone" DROP CONSTRAINT IF EXISTS "DnsZone_registrarId_fkey";
ALTER TABLE "DnsZone" DROP COLUMN "registrarId";

-- Add FK from DnsZone to Client
ALTER TABLE "DnsZone" ADD CONSTRAINT "DnsZone_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new unique index (ovhZoneName, clientId)
CREATE UNIQUE INDEX "DnsZone_ovhZoneName_clientId_key" ON "DnsZone"("ovhZoneName", "clientId");

-- Drop RegistrarConfig (FK to Client is on this table, auto-dropped)
DROP TABLE IF EXISTS "RegistrarConfig";

-- Drop Registrar (FK to Client is on this table, auto-dropped)
DROP TABLE IF EXISTS "Registrar";
