import Link from "next/link";
import type { Asset } from "@/generated/prisma/client";

type AssetDetail = Omit<Asset, "assetImage" | "nameplateImage">;

export function AssetDetailPanel({
  asset,
  structurePath,
}: {
  asset: AssetDetail;
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
      {(asset.assetImageType || asset.nameplateImageType) && (
        <div className="flex flex-wrap gap-4">
          {asset.assetImageType && (
            <div className="flex flex-col gap-1">
              <span className="md-label-large text-on-surface">
                Asset photo
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/assets/${asset.id}/images/asset`}
                alt={`${asset.name} photo`}
                className="h-32 w-32 rounded-xs object-cover"
              />
            </div>
          )}
          {asset.nameplateImageType && (
            <div className="flex flex-col gap-1">
              <span className="md-label-large text-on-surface">
                Nameplate photo
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/assets/${asset.id}/images/nameplate`}
                alt={`${asset.name} nameplate`}
                className="h-32 w-32 rounded-xs object-cover"
              />
            </div>
          )}
        </div>
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
