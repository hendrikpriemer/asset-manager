import { notFound } from "next/navigation";
import { getAssetStructureTree } from "@/lib/asset-structure";
import { AssetStructureEditorSection } from "@/components/AssetStructureEditorSection";

export default async function EditAssetStructurePage() {
  const tree = await getAssetStructureTree();
  if (!tree) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <AssetStructureEditorSection tree={tree} />
    </main>
  );
}
