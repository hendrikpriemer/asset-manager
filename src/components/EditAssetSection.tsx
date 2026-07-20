import type { Asset } from "@/generated/prisma/client";
import { AssetWizard } from "@/components/AssetWizard";
import type { StructureOption } from "@/lib/asset-structure";

type EditableAsset = Pick<
  Asset,
  | "name"
  | "description"
  | "structureNodeId"
  | "assetImageType"
  | "nameplateImageType"
  | "aasEndpointUrl"
  | "aasGlobalAssetId"
>;

export function EditAssetSection({
  id,
  asset,
  structureOptions,
  successHref,
}: {
  id: string;
  asset: EditableAsset;
  structureOptions: StructureOption[];
  successHref?: string;
}) {
  return (
    <AssetWizard
      mode="edit"
      assetId={id}
      initialName={asset.name}
      initialDescription={asset.description ?? ""}
      initialStructureNodeId={asset.structureNodeId ?? ""}
      initialAasReference={asset.aasEndpointUrl ?? asset.aasGlobalAssetId ?? ""}
      existingAssetImageUrl={
        asset.assetImageType ? `/api/assets/${id}/images/asset` : null
      }
      existingNameplateImageUrl={
        asset.nameplateImageType
          ? `/api/assets/${id}/images/nameplate`
          : null
      }
      structureOptions={structureOptions}
      successHref={successHref}
    />
  );
}
