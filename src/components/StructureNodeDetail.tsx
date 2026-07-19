import Link from "next/link";
import type { Asset, AssetStructureNode } from "@/generated/prisma/client";
import { LevelBadge } from "@/components/LevelBadge";

export function StructureNodeDetail({
  node,
  breadcrumb,
  assets,
}: {
  node: AssetStructureNode;
  breadcrumb: string[];
  assets: Omit<Asset, "assetImage" | "nameplateImage">[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="md-body-small text-on-surface-variant">
        {breadcrumb.join(" / ")}
      </p>
      <div className="flex items-center gap-3">
        <h1 className="md-headline-small text-on-surface">{node.name}</h1>
        <LevelBadge level={node.level} />
      </div>
      {node.description && (
        <p className="md-body-medium text-on-surface-variant">
          {node.description}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="md-title-medium text-on-surface">Assigned assets</h2>
        {assets.length === 0 ? (
          <p className="md-body-medium text-on-surface-variant">
            No assets assigned to this level.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {assets.map((asset) => (
              <li key={asset.id}>
                <Link
                  href={`/asset-structure/asset/${asset.id}`}
                  className="md-body-large text-primary hover:underline"
                >
                  {asset.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
