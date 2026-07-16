import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAssetStructureTree } from "@/lib/asset-structure";
import { EmptyAssetStructureState } from "@/components/EmptyAssetStructureState";
import { StructureBrowserSection } from "@/components/StructureBrowserSection";
import { StructureViewTabs } from "@/components/StructureViewTabs";

export default async function AssetStructurePage() {
  const tree = await getAssetStructureTree();

  if (!tree) {
    return (
      <main className="flex w-full flex-col gap-6 p-8">
        <EmptyAssetStructureState />
      </main>
    );
  }

  const assets = await prisma.asset.findMany({
    where: { structureNodeId: tree.id },
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
        node={tree}
        breadcrumb={[tree.name]}
        assets={assets}
      />
    </main>
  );
}
