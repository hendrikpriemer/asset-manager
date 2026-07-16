import Link from "next/link";
import type { AssetWithStructurePath } from "@/lib/asset-structure";
import { deleteAsset } from "@/lib/actions";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";

export function AssetTable({ assets }: { assets: AssetWithStructurePath[] }) {
  if (assets.length === 0) {
    return <p className="md-body-large text-on-surface-variant">No assets yet.</p>;
  }

  return (
    <table className="w-full border-collapse rounded-lg text-left md-body-medium">
      <thead>
        <tr className="border-b border-outline-variant bg-surface-container">
          <th className="py-3 pr-4 pl-4 md-title-small text-on-surface-variant">
            Name
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Description
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Structure
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Updated
          </th>
          <th className="py-3 pr-4 md-title-small text-on-surface-variant">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr
            key={asset.id}
            className="border-b border-outline-variant hover:bg-on-surface/[0.04]"
          >
            <td className="py-3 pr-4 pl-4 text-on-surface">{asset.name}</td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {asset.description ?? "—"}
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {asset.structurePath ?? "Unassigned"}
            </td>
            <td className="py-3 pr-4 text-on-surface-variant">
              {asset.updatedAt.toLocaleString()}
            </td>
            <td className="flex items-center gap-1 py-2 pr-4">
              <Link
                href={`/assets/${asset.id}/edit`}
                className="rounded-full px-3 py-2 md-label-large text-primary hover:bg-primary/[0.08]"
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
