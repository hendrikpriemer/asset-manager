import type { Asset } from "@/generated/prisma/client";
import { updateAsset } from "@/lib/actions";
import { AssetForm } from "@/components/AssetForm";

export function EditAssetSection({
  id,
  asset,
}: {
  id: string;
  asset: Pick<Asset, "name" | "description">;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Edit Asset</h1>
      <AssetForm
        action={updateAsset.bind(null, id)}
        initialValues={{ name: asset.name, description: asset.description }}
        submitLabel="Save"
      />
    </>
  );
}
