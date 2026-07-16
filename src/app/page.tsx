import { getAssetCount } from "@/lib/assets";
import { AssetsTile } from "@/components/AssetsTile";

export default async function OverviewPage() {
  const count = await getAssetCount();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <h1 className="md-headline-medium text-on-background">Overview</h1>
      <AssetsTile count={count} />
    </main>
  );
}
