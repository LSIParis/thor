-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
