-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "assetImage" BYTEA,
ADD COLUMN     "assetImageType" TEXT,
ADD COLUMN     "nameplateImage" BYTEA,
ADD COLUMN     "nameplateImageType" TEXT;
