import { getAssetByIdOrNotFound } from "@/lib/assets";
import { Modal } from "@/components/Modal";
import { EditAssetSection } from "@/components/EditAssetSection";

export default async function EditAssetModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAssetByIdOrNotFound(id);

  return (
    <Modal>
      <EditAssetSection id={id} asset={asset} />
    </Modal>
  );
}
