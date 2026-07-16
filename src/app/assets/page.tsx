import Link from "next/link";
import { getAssetsWithStructurePath } from "@/lib/asset-structure";
import { AssetTable } from "@/components/AssetTable";

export default async function AssetsPage() {
  const assets = await getAssetsWithStructurePath();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="md-headline-medium text-on-background">Assets</h1>
        <Link
          href="/assets/new"
          className="rounded-full bg-primary px-6 py-2.5 md-label-large text-on-primary"
        >
          New Asset
        </Link>
      </div>
      <AssetTable assets={assets} />
    </main>
  );
}
