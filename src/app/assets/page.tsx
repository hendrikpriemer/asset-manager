import Link from "next/link";
import { getAssets } from "@/lib/assets";
import { AssetTable } from "@/components/AssetTable";

export default async function AssetsPage() {
  const assets = await getAssets();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assets</h1>
        <Link
          href="/assets/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          New Asset
        </Link>
      </div>
      <AssetTable assets={assets} />
    </main>
  );
}
