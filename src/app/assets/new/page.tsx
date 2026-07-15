import { createAsset } from "@/lib/actions";
import { AssetForm } from "@/components/AssetForm";

export default function NewAssetPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">New Asset</h1>
      <AssetForm action={createAsset} submitLabel="Create" />
    </main>
  );
}
