import Link from "next/link";
import type { Asset } from "@/generated/prisma/client";
import type { AasData } from "@/lib/aas";
import { AasViewer } from "@/components/AasViewer";
import { RefreshAasSearchIndexButton } from "@/components/RefreshAasSearchIndexButton";
import { NameplateAnalysisButton } from "@/components/NameplateAnalysisButton";

type AssetDetail = Omit<Asset, "assetImage" | "nameplateImage">;

export function AssetDetailPanel({
  asset,
  structurePath,
  aasData,
}: {
  asset: AssetDetail;
  structurePath: string | null;
  aasData?: AasData | null;
}) {
  const hasAasReference = Boolean(
    asset.aasEndpointUrl || asset.aasGlobalAssetId
  );
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
              <NameplateAnalysisButton assetId={asset.id} />
            </div>
          )}
        </div>
      )}
      {hasAasReference && (
        <div className="flex flex-col gap-2">
          <span className="md-label-large text-on-surface">
            Asset Administration Shell
          </span>
          {aasData ? (
            <div className="rounded-xs">
              <p className="mb-2 md-body-medium text-on-surface">
                {aasData.idShort || aasData.id}
              </p>
              <AasViewer aasData={aasData} assetId={asset.id} />
            </div>
          ) : (
            <p className="md-body-small text-on-surface-variant">
              AAS data could not be loaded.
            </p>
          )}
          <p className="md-body-small text-on-surface-variant">
            {asset.aasSearchIndexedAt
              ? `Search index last updated ${asset.aasSearchIndexedAt.toLocaleString("en-US", { timeZone: "UTC" })}`
              : "Not yet indexed"}
          </p>
          <RefreshAasSearchIndexButton assetId={asset.id} />
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
