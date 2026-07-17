import { prisma } from "@/lib/prisma";
import { getNodeBreadcrumb } from "@/lib/asset-structure";
import { getAssetByIdOrNotFound } from "@/lib/assets";
import { AssetDetailPanel } from "@/components/AssetDetailPanel";

export default async function AssetStructureAssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const asset = await getAssetByIdOrNotFound(assetId);

  let structurePath: string | null = null;
  if (asset.structureNodeId) {
    const allNodes = await prisma.assetStructureNode.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const nodesById = new Map(allNodes.map((n) => [n.id, n]));
    structurePath = getNodeBreadcrumb(asset.structureNodeId, nodesById).join(" / ");
  }

  return <AssetDetailPanel asset={asset} structurePath={structurePath} />;
}
