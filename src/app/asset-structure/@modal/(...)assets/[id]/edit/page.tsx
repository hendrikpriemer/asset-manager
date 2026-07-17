import { getAssetByIdOrNotFound } from "@/lib/assets";
import { getFlattenedStructureOptions } from "@/lib/asset-structure";
import { Modal } from "@/components/Modal";
import { EditAssetSection } from "@/components/EditAssetSection";

export default async function EditAssetModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [asset, structureOptions] = await Promise.all([
    getAssetByIdOrNotFound(id),
    getFlattenedStructureOptions(),
  ]);

  return (
    <Modal>
      <EditAssetSection id={id} asset={asset} structureOptions={structureOptions} />
    </Modal>
  );
}
