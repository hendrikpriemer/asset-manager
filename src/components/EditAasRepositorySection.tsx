import { AasRepositoryWizard } from "@/components/AasRepositoryWizard";

export function EditAasRepositorySection({
  repositoryId,
  name,
  baseUrl,
}: {
  repositoryId: string;
  name: string;
  baseUrl: string;
}) {
  return (
    <AasRepositoryWizard
      mode="edit"
      repositoryId={repositoryId}
      initialName={name}
      initialBaseUrl={baseUrl}
    />
  );
}
