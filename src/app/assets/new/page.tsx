import { getFlattenedStructureOptions } from "@/lib/asset-structure";
import { NewAssetSection } from "@/components/NewAssetSection";

export default async function NewAssetPage() {
  const structureOptions = await getFlattenedStructureOptions();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <NewAssetSection
        structureOptions={structureOptions}
        successHref="/asset-structure/table"
      />
    </main>
  );
}
