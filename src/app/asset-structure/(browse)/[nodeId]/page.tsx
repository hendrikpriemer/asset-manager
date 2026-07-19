import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNodeBreadcrumb } from "@/lib/asset-structure";
import { StructureNodeDetail } from "@/components/StructureNodeDetail";

export default async function AssetStructureNodePage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  const node = await prisma.assetStructureNode.findUnique({
    where: { id: nodeId },
  });
  if (!node) {
    notFound();
  }

  const allNodes = await prisma.assetStructureNode.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));
  const breadcrumb = getNodeBreadcrumb(nodeId, nodesById);

  const assets = await prisma.asset.findMany({
    where: { structureNodeId: nodeId },
    orderBy: { updatedAt: "desc" },
    omit: { assetImage: true, nameplateImage: true },
  });

  return <StructureNodeDetail node={node} breadcrumb={breadcrumb} assets={assets} />;
}
