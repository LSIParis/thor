-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "ipType" TEXT,
ADD COLUMN     "photoPath" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "warrantyDuration" TEXT;
