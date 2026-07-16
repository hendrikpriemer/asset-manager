import { notFound } from "next/navigation";
import { getAssetStructureTree } from "@/lib/asset-structure";
import { Modal } from "@/components/Modal";
import { AssetStructureEditorSection } from "@/components/AssetStructureEditorSection";

export default async function EditAssetStructureModal() {
  const tree = await getAssetStructureTree();
  if (!tree) {
    notFound();
  }

  return (
    <Modal>
      <AssetStructureEditorSection tree={tree} />
    </Modal>
  );
}
