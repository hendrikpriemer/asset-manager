import { createAsset } from "@/lib/actions";
import { AssetForm } from "@/components/AssetForm";

export function NewAssetSection() {
  return (
    <>
      <h1 className="text-2xl font-semibold">New Asset</h1>
      <AssetForm action={createAsset} submitLabel="Create" />
    </>
  );
}
