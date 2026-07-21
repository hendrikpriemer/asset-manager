import { getAasRepositoryByIdOrNotFound } from "@/lib/aas-repositories";
import { EditAasRepositorySection } from "@/components/EditAasRepositorySection";

export default async function EditAasRepositoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = await getAasRepositoryByIdOrNotFound(id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <EditAasRepositorySection
        repositoryId={id}
        name={repository.name}
        baseUrl={repository.baseUrl}
      />
    </main>
  );
}
