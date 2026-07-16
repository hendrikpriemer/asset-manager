import Link from "next/link";
import { getAssetStructureTree, flattenAssetStructure } from "@/lib/asset-structure";
import { EmptyAssetStructureState } from "@/components/EmptyAssetStructureState";
import { StructureTable } from "@/components/StructureTable";
import { StructureViewTabs } from "@/components/StructureViewTabs";

export default async function AssetStructureTablePage() {
  const tree = await getAssetStructureTree();

  if (!tree) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        <EmptyAssetStructureState />
      </main>
    );
  }

  const rows = flattenAssetStructure(tree);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-8">
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
      <StructureTable rows={rows} />
    </main>
  );
}
