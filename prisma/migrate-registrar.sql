-- 1. Créer la table Registrar
CREATE TABLE IF NOT EXISTS "Registrar" (
  "id"        TEXT NOT NULL,
  "clientId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Registrar_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Registrar_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Insérer un Registrar par couple (clientId, registrar) distinct dans DnsZone
--    Si registrar est NULL, on crée un registrar nommé "Manuel"
INSERT INTO "Registrar" ("id", "clientId", "name", "createdAt")
SELECT
  gen_random_uuid()::text,
  "clientId",
  COALESCE(NULLIF(TRIM("registrar"), ''), 'Manuel'),
  NOW()
FROM "DnsZone"
GROUP BY "clientId", COALESCE(NULLIF(TRIM("registrar"), ''), 'Manuel')
ON CONFLICT DO NOTHING;

-- 3. Ajouter la colonne registrarId (nullable d'abord)
ALTER TABLE "DnsZone" ADD COLUMN IF NOT EXISTS "registrarId" TEXT;

-- 4. Remplir registrarId en faisant correspondre clientId + registrar
UPDATE "DnsZone" z
SET "registrarId" = r."id"
FROM "Registrar" r
WHERE r."clientId" = z."clientId"
  AND r."name" = COALESCE(NULLIF(TRIM(z."registrar"), ''), 'Manuel');

-- 5. Rendre registrarId NOT NULL
ALTER TABLE "DnsZone" ALTER COLUMN "registrarId" SET NOT NULL;

-- 6. Ajouter la foreign key
ALTER TABLE "DnsZone"
  ADD CONSTRAINT "DnsZone_registrarId_fkey"
  FOREIGN KEY ("registrarId") REFERENCES "Registrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Supprimer l'ancienne contrainte unique et ajouter la nouvelle
ALTER TABLE "DnsZone" DROP CONSTRAINT IF EXISTS "DnsZone_ovhZoneName_clientId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "DnsZone_ovhZoneName_registrarId_key"
  ON "DnsZone"("ovhZoneName", "registrarId")
  WHERE "ovhZoneName" IS NOT NULL;

-- 8. Supprimer les anciennes colonnes
ALTER TABLE "DnsZone" DROP COLUMN IF EXISTS "clientId";
ALTER TABLE "DnsZone" DROP COLUMN IF EXISTS "registrar";

-- 9. Supprimer l'ancienne foreign key client sur DnsZone si elle existe
ALTER TABLE "DnsZone" DROP CONSTRAINT IF EXISTS "DnsZone_clientId_fkey";
