import { getAasRepositories } from "@/lib/aas-repositories";
import { AasRepositoriesSection } from "@/components/AasRepositoriesSection";

export default async function AasRepositoriesPage() {
  const repositories = await getAasRepositories();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <AasRepositoriesSection repositories={repositories} />
    </main>
  );
}
