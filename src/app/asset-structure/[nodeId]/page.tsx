import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAssetStructureTree, getNodeBreadcrumb } from "@/lib/asset-structure";
import { StructureBrowserSection } from "@/components/StructureBrowserSection";
import { StructureViewTabs } from "@/components/StructureViewTabs";

export default async function AssetStructureNodePage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;
  const tree = await getAssetStructureTree();
  if (!tree) {
    notFound();
  }

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
  });

  return (
    <main className="flex w-full flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="md-headline-medium text-on-background">
          Asset Structure
        </h1>
        <Link
          href="/asset-structure/edit"
          className="rounded-full bg-primary px-6 py-2.5 md-label-large text-on-primary"
        >
          Edit structure
        </Link>
      </div>
      <StructureViewTabs />
      <StructureBrowserSection
        tree={tree}
        node={node}
        breadcrumb={breadcrumb}
        assets={assets}
      />
    </main>
  );
}
