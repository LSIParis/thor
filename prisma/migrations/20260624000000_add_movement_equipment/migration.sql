-- AlterTable
ALTER TABLE "PersonnelMovement" ADD COLUMN "assignedEquipmentId" TEXT;

-- AddForeignKey
ALTER TABLE "PersonnelMovement" ADD CONSTRAINT "PersonnelMovement_assignedEquipmentId_fkey" FOREIGN KEY ("assignedEquipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
