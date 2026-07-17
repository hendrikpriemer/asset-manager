import Link from "next/link";
import type { Asset } from "@/generated/prisma/client";

export function AssetDetailPanel({
  asset,
  structurePath,
}: {
  asset: Asset;
  structurePath: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="md-body-small text-on-surface-variant">
        {structurePath ?? "Unassigned"}
      </p>
      <h1 className="md-headline-small text-on-surface">{asset.name}</h1>
      {asset.description && (
        <p className="md-body-medium text-on-surface-variant">
          {asset.description}
        </p>
      )}
      <Link
        href={`/assets/${asset.id}/edit`}
        className="w-fit md-label-large text-primary hover:underline"
      >
        Edit asset
      </Link>
    </div>
  );
}
