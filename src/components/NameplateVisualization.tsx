"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { AasElementGroup } from "@/lib/aas";
import type { AasNameplateData, AasNameplateMarking } from "@/lib/aas-nameplate";
import { lookupNameplateCoordinates } from "@/lib/aas-actions";
import { AasElementGroupView } from "@/components/AasElementGroupView";
import { Icon } from "@/components/Icon";
import { Spinner } from "@/components/Spinner";

const NameplateMap = dynamic(
  () => import("@/components/NameplateMap").then((mod) => mod.NameplateMap),
  { ssr: false }
);

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="mr-2 rounded-xs border border-outline-variant px-1.5 py-0.5 md-label-small text-on-surface-variant">
      {type}
    </span>
  );
}

function ProductCard({ nameplate }: { nameplate: AasNameplateData }) {
  if (nameplate.productProperties.length === 0 && nameplate.versions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xs border border-outline-variant">
      <div className="border-b border-outline-variant p-4">
        <h4 className="md-title-small text-on-surface">Product</h4>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] px-4">
        {nameplate.productProperties.map((property, index) => (
          <div
            key={`${property.idShort}-${index}`}
            className="contents odd:bg-surface-container-low"
          >
            <dt className="py-2 pr-4 md-body-small text-on-surface-variant">
              {property.idShort}
            </dt>
            <dd className="py-2 pr-2 md-body-small text-on-surface">
              {property.idShort === "URIOfTheProduct" &&
              property.value.startsWith("http") ? (
                <a
                  href={property.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {property.value}
                </a>
              ) : (
                property.value
              )}
            </dd>
          </div>
        ))}
        {nameplate.versions.length > 0 && (
          <div className="contents odd:bg-surface-container-low">
            <dt className="py-2 pr-4 md-body-small text-on-surface-variant">
              Versions
            </dt>
            <dd className="flex flex-wrap items-center gap-2 py-2 pr-2">
              {nameplate.versions.map((version) => (
                <span
                  key={version.idShort}
                  className="rounded-xs border border-outline-variant px-2 py-0.5 md-label-small text-on-surface"
                >
                  {version.idShort}: {version.value}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function DownloadVCardButton({
  vCard,
  manufacturerName,
}: {
  vCard: string;
  manufacturerName: string | null;
}) {
  function handleDownloadVCard() {
    const blob = new Blob([vCard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${manufacturerName || "contact"}.vcf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownloadVCard}
      className="flex w-fit items-center gap-2 rounded-full bg-primary px-4 py-2 md-label-large text-on-primary"
    >
      <Icon name="contact_page" />
      Download Contact
    </button>
  );
}

function ManufacturerCard({ nameplate }: { nameplate: AasNameplateData }) {
  const hasContent =
    nameplate.manufacturerName ||
    nameplate.companyLogo ||
    nameplate.address ||
    nameplate.phone ||
    nameplate.fax ||
    nameplate.email ||
    nameplate.vCard;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="rounded-xs border border-outline-variant">
      <div className="border-b border-outline-variant p-4">
        <h4 className="md-title-small text-on-surface">Manufacturer</h4>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {nameplate.companyLogo?.value &&
          nameplate.companyLogo.contentType?.includes("image") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nameplate.companyLogo.value}
              alt={nameplate.manufacturerName ?? "Company logo"}
              className="max-h-32 max-w-[200px] object-contain"
            />
          )}
        {nameplate.manufacturerName && (
          <p className="md-body-medium text-on-surface">{nameplate.manufacturerName}</p>
        )}
        {nameplate.address && (
          <p className="md-body-small text-on-surface-variant">{nameplate.address}</p>
        )}
        {nameplate.phone && (
          <p className="md-body-small">
            {nameplate.phone.type && <TypeBadge type={nameplate.phone.type} />}
            <a
              href={`tel:${nameplate.phone.value.replaceAll(" ", "")}`}
              className="text-primary hover:underline"
            >
              {nameplate.phone.value}
            </a>
          </p>
        )}
        {nameplate.fax && (
          <p className="md-body-small">
            {nameplate.fax.type && <TypeBadge type={nameplate.fax.type} />}
            <span className="text-on-surface">{nameplate.fax.value}</span>
          </p>
        )}
        {nameplate.email && (
          <p className="md-body-small">
            {nameplate.email.type && <TypeBadge type={nameplate.email.type} />}
            <a
              href={`mailto:${nameplate.email.value}`}
              className="text-primary hover:underline"
            >
              {nameplate.email.value}
            </a>
          </p>
        )}
        {nameplate.vCard && (
          <DownloadVCardButton
            vCard={nameplate.vCard}
            manufacturerName={nameplate.manufacturerName}
          />
        )}
      </div>
    </div>
  );
}

function ManufacturerMapSection({ address }: { address: string }) {
  const [coordinates, setCoordinates] = useState<
    { lat: number; lon: number } | null | undefined
  >(undefined);

  useEffect(() => {
    let cancelled = false;
    // Reset to the loading state whenever the address changes, so a stale
    // marker from a previous address never lingers while the new one resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCoordinates(undefined);
    lookupNameplateCoordinates(address).then((result) => {
      if (!cancelled) {
        setCoordinates(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (coordinates === undefined) {
    return (
      <div className="flex items-center justify-center rounded-xs border border-outline-variant p-8">
        <Spinner label="Locating manufacturer" />
      </div>
    );
  }

  if (coordinates === null) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-xs border border-outline-variant">
      <NameplateMap lat={coordinates.lat} lon={coordinates.lon} />
    </div>
  );
}

function MarkingsCard({ markings }: { markings: AasNameplateMarking[] }) {
  if (markings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xs border border-outline-variant">
      <div className="border-b border-outline-variant p-4">
        <h4 className="md-title-small text-on-surface">Markings</h4>
      </div>
      <div className="flex flex-wrap gap-4 p-4">
        {markings.map((marking) => (
          <div key={marking.name} className="flex flex-col items-center gap-1">
            {marking.file.value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={marking.file.value}
                alt={marking.name}
                className="h-24 w-24 object-contain"
              />
            )}
            <span className="md-body-small text-on-surface-variant">{marking.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetSpecificPropertiesCard({ group }: { group: AasElementGroup }) {
  if (
    group.properties.length === 0 &&
    group.files.length === 0 &&
    group.groups.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-xs border border-outline-variant">
      <div className="border-b border-outline-variant p-4">
        <h4 className="md-title-small text-on-surface">
          {group.displayName || "Asset Specific Properties"}
        </h4>
      </div>
      <div className="overflow-x-auto px-4">
        <AasElementGroupView group={group} depth={0} />
      </div>
    </div>
  );
}

export function NameplateVisualization({ nameplate }: { nameplate: AasNameplateData }) {
  return (
    <div className="flex flex-col gap-4">
      <ProductCard nameplate={nameplate} />
      <ManufacturerCard nameplate={nameplate} />
      {nameplate.address && <ManufacturerMapSection address={nameplate.address} />}
      <MarkingsCard markings={nameplate.markings} />
      {nameplate.assetSpecificProperties && (
        <AssetSpecificPropertiesCard group={nameplate.assetSpecificProperties} />
      )}
    </div>
  );
}
