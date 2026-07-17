import { getAssetStructureTree, getUnassignedAssets } from "@/lib/asset-structure";
import { EmptyAssetStructureState } from "@/components/EmptyAssetStructureState";
import { StructureBrowserSection } from "@/components/StructureBrowserSection";
import { StructureViewTabs } from "@/components/StructureViewTabs";

export default async function AssetStructureBrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tree = await getAssetStructureTree();

  if (!tree) {
    return (
      <main className="flex w-full flex-col gap-6 p-8">
        <EmptyAssetStructureState />
      </main>
    );
  }

  const unassignedAssets = await getUnassignedAssets();

  return (
    <main className="flex h-screen w-full flex-col gap-6 overflow-hidden p-8">
      <h1 className="md-headline-medium text-on-background">Asset Manager</h1>
      <StructureViewTabs />
      <StructureBrowserSection
        tree={tree}
        unassignedAssets={unassignedAssets}
        detail={children}
      />
    </main>
  );
}
