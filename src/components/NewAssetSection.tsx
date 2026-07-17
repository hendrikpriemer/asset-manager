import { createAsset } from "@/lib/actions";
import type { StructureOption } from "@/lib/asset-structure";
import { AssetForm } from "@/components/AssetForm";

export function NewAssetSection({
  structureOptions,
  successHref,
}: {
  structureOptions: StructureOption[];
  successHref?: string;
}) {
  return (
    <>
      <h1 className="md-headline-small text-on-surface">New Asset</h1>
      <AssetForm
        action={createAsset}
        submitLabel="Create"
        structureOptions={structureOptions}
        successHref={successHref}
      />
    </>
  );
}
