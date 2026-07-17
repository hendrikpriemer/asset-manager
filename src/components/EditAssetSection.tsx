import type { Asset } from "@/generated/prisma/client";
import { updateAsset } from "@/lib/actions";
import type { StructureOption } from "@/lib/asset-structure";
import { AssetForm } from "@/components/AssetForm";

export function EditAssetSection({
  id,
  asset,
  structureOptions,
  successHref,
}: {
  id: string;
  asset: Pick<Asset, "name" | "description" | "structureNodeId">;
  structureOptions: StructureOption[];
  successHref?: string;
}) {
  return (
    <>
      <h1 className="md-headline-small text-on-surface">Edit Asset</h1>
      <AssetForm
        action={updateAsset.bind(null, id)}
        initialValues={{
          name: asset.name,
          description: asset.description,
          structureNodeId: asset.structureNodeId,
        }}
        structureOptions={structureOptions}
        submitLabel="Save"
        successHref={successHref}
      />
    </>
  );
}
