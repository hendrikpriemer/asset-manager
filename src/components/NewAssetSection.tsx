import { AssetWizard } from "@/components/AssetWizard";
import type { StructureOption } from "@/lib/asset-structure";

export function NewAssetSection({
  structureOptions,
  successHref,
}: {
  structureOptions: StructureOption[];
  successHref?: string;
}) {
  return (
    <AssetWizard
      mode="create"
      structureOptions={structureOptions}
      successHref={successHref}
    />
  );
}
