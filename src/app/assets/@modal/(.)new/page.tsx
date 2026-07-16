import { getFlattenedStructureOptions } from "@/lib/asset-structure";
import { Modal } from "@/components/Modal";
import { NewAssetSection } from "@/components/NewAssetSection";

export default async function NewAssetModal() {
  const structureOptions = await getFlattenedStructureOptions();

  return (
    <Modal>
      <NewAssetSection structureOptions={structureOptions} />
    </Modal>
  );
}
