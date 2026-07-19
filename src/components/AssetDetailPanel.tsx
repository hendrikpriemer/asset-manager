import Link from "next/link";
import type { Asset } from "@/generated/prisma/client";
import type { AasData } from "@/lib/aas";

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
            <div className="flex flex-col gap-3 rounded-xs border border-outline-variant p-4">
              <p className="md-body-medium text-on-surface">
                {aasData.idShort || aasData.id}
              </p>
              {aasData.submodels.map((submodel) => (
                <div key={submodel.id} className="flex flex-col gap-1">
                  <span className="md-label-large text-on-surface-variant">
                    {submodel.idShort || submodel.id}
                  </span>
                  <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                    {submodel.properties.map((property) => (
                      <div key={property.idShort} className="contents">
                        <dt className="md-body-small text-on-surface-variant">
                          {property.idShort}
                        </dt>
                        <dd className="md-body-small text-on-surface">
                          {property.value ?? "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="md-body-small text-on-surface-variant">
              AAS data could not be loaded.
            </p>
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
