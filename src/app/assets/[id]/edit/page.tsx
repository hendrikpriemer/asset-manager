import { getAssetByIdOrNotFound } from "@/lib/assets";
import { getFlattenedStructureOptions } from "@/lib/asset-structure";
import { EditAssetSection } from "@/components/EditAssetSection";

export default async function EditAssetPage({
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <EditAssetSection id={id} asset={asset} structureOptions={structureOptions} />
    </main>
  );
}
