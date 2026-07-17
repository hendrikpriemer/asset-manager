import { getAssetStructureTree, getAssetsWithStructurePath } from "@/lib/asset-structure";
import { EmptyAssetStructureState } from "@/components/EmptyAssetStructureState";
import { SearchableAssetTable } from "@/components/SearchableAssetTable";
import { StructureViewTabs } from "@/components/StructureViewTabs";

export default async function AssetStructureTablePage() {
  const tree = await getAssetStructureTree();

  if (!tree) {
    return (
      <main className="flex w-full flex-col gap-6 p-8">
        <EmptyAssetStructureState />
      </main>
    );
  }

  const assets = await getAssetsWithStructurePath();

  return (
    <main className="flex w-full flex-col gap-6 p-8">
      <h1 className="md-headline-medium text-on-background">Asset Manager</h1>
      <StructureViewTabs />
      <SearchableAssetTable assets={assets} />
    </main>
  );
}
