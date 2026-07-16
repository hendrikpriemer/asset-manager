-- CreateEnum
CREATE TYPE "AssetStructureLevel" AS ENUM ('ENTERPRISE', 'SITE', 'AREA', 'WORK_CENTER', 'EQUIPMENT');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "structureNodeId" TEXT;

-- CreateTable
CREATE TABLE "AssetStructureNode" (
    "id" TEXT NOT NULL,
    "level" "AssetStructureLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetStructureNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetStructureNode_parentId_position_idx" ON "AssetStructureNode"("parentId", "position");

-- CreateIndex
CREATE INDEX "Asset_structureNodeId_idx" ON "Asset"("structureNodeId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_structureNodeId_fkey" FOREIGN KEY ("structureNodeId") REFERENCES "AssetStructureNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStructureNode" ADD CONSTRAINT "AssetStructureNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssetStructureNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
