import Link from "next/link";
import type { AssetWithStructurePath } from "@/lib/asset-structure";
import { deleteAsset } from "@/lib/actions";
import { DeleteAssetButton } from "@/components/DeleteAssetButton";
import { Icon } from "@/components/Icon";
import { Tooltip } from "@/components/Tooltip";

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
              <Tooltip label="Edit">
                <Link
                  href={`/assets/${asset.id}/edit`}
                  aria-label={`Edit ${asset.name}`}
                  className="inline-flex items-center justify-center rounded-full p-2 text-on-surface-variant hover:bg-on-surface/8"
                >
                  <Icon name="edit" />
                </Link>
              </Tooltip>
              <Tooltip label="Delete">
                <DeleteAssetButton
                  assetId={asset.id}
                  assetName={asset.name}
                  deleteAssetAction={deleteAsset}
                />
              </Tooltip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
