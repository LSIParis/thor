-- AlterTable
ALTER TABLE "PersonnelMovement" ADD COLUMN     "docusealSlug" TEXT,
ADD COLUMN     "docusealSubmissionId" INTEGER,
ADD COLUMN     "docusealSignedAt" TIMESTAMP(3);
