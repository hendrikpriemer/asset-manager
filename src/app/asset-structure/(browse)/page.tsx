import { prisma } from "@/lib/prisma";
import { getAssetStructureTree } from "@/lib/asset-structure";
import { StructureNodeDetail } from "@/components/StructureNodeDetail";

export default async function AssetStructurePage() {
  const tree = await getAssetStructureTree();
  if (!tree) {
    return null;
  }

  const assets = await prisma.asset.findMany({
    where: { structureNodeId: tree.id },
    orderBy: { updatedAt: "desc" },
    omit: { assetImage: true, nameplateImage: true },
  });

  return <StructureNodeDetail node={tree} breadcrumb={[tree.name]} assets={assets} />;
}
