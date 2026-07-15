import Link from "next/link";
import type { Asset } from "@/generated/prisma/client";
import { deleteAsset } from "@/lib/actions";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";

export function AssetTable({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return <p className="text-zinc-500">No assets yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="py-2 pr-4 font-medium">Name</th>
          <th className="py-2 pr-4 font-medium">Description</th>
          <th className="py-2 pr-4 font-medium">Updated</th>
          <th className="py-2 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr
            key={asset.id}
            className="border-b border-zinc-100 dark:border-zinc-900"
          >
            <td className="py-2 pr-4">{asset.name}</td>
            <td className="py-2 pr-4 text-zinc-500">
              {asset.description ?? "—"}
            </td>
            <td className="py-2 pr-4 text-zinc-500">
              {asset.updatedAt.toLocaleString()}
            </td>
            <td className="py-2 flex items-center gap-3">
              <Link
                href={`/assets/${asset.id}/edit`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Edit
              </Link>
              <DeleteAssetButton
                assetId={asset.id}
                deleteAssetAction={deleteAsset}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
