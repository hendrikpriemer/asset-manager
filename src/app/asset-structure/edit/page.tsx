import { notFound } from "next/navigation";
import { getAssetStructureTree } from "@/lib/asset-structure";
import { AssetStructureEditorSection } from "@/components/AssetStructureEditorSection";

export default async function EditAssetStructurePage() {
  const tree = await getAssetStructureTree();
  if (!tree) {
    notFound();
  }

  return (
    <main className="flex w-full flex-col gap-6 p-8">
      <AssetStructureEditorSection tree={tree} />
    </main>
  );
}
