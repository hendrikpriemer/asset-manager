import { getAasRepositoryByIdOrNotFound } from "@/lib/aas-repositories";
import { Modal } from "@/components/Modal";
import { EditAasRepositorySection } from "@/components/EditAasRepositorySection";

export default async function EditAasRepositoryModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = await getAasRepositoryByIdOrNotFound(id);

  return (
    <Modal>
      <EditAasRepositorySection
        repositoryId={id}
        name={repository.name}
        baseUrl={repository.baseUrl}
      />
    </Modal>
  );
}
