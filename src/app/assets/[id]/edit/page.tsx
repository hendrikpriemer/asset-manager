import { notFound } from "next/navigation";
import { getAssetById } from "@/lib/assets";
import { updateAsset } from "@/lib/actions";
import { AssetForm } from "@/components/AssetForm";

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asset = await getAssetById(id);

  if (!asset) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Edit Asset</h1>
      <AssetForm
        action={updateAsset.bind(null, id)}
        initialValues={{ name: asset.name, description: asset.description }}
        submitLabel="Save"
      />
    </main>
  );
}
