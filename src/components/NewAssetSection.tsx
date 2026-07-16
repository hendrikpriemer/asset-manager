import { createAsset } from "@/lib/actions";
import { AssetForm } from "@/components/AssetForm";

export function NewAssetSection() {
  return (
    <>
      <h1 className="md-headline-small text-on-surface">New Asset</h1>
      <AssetForm action={createAsset} submitLabel="Create" />
    </>
  );
}
