-- AlterTable
ALTER TABLE "AasRepository" ADD COLUMN     "isLocalMirror" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "aasSearchIndexedAt" TIMESTAMP(3),
ADD COLUMN     "aasSearchText" TEXT;
