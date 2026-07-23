/**
 * Publishes an asset's own record (name, description, structure assignment)
 * as a real Asset Administration Shell + Submodel in our local AAS mirror -
 * additive to its Postgres row, not a replacement for it. Postgres stays
 * the source of truth for the app's own UI/CRUD; this just gives every
 * asset a stable, spec-compliant AAS presence in `basyx-aas-env` alongside
 * whatever externally-linked manufacturer AAS it may also reference.
 *
 * Reuses `mirrorAasDataToLocalRepo` (lib/aas-mirror.ts) as-is: that function
 * already does exactly "write this shell+submodel pair into the local
 * mirror" regardless of whether the data was fetched from an external
 * repository (its original use) or generated from our own DB row (this
 * one).
 */

import { encodeAasId } from "@/lib/aas";
import { ensureLocalMirrorRepository } from "@/lib/aas-repositories";
import { mirrorAasDataToLocalRepo } from "@/lib/aas-mirror";

const NAMESPACE = "https://asset-manager.internal";
const DELETE_TIMEOUT_MS = 5000;

export type PublishableAsset = {
  id: string;
  name: string;
  description: string | null;
  structureNodeId: string | null;
  aasEndpointUrl: string | null;
  aasGlobalAssetId: string | null;
  // Set once a local "Nameplate" submodel has been generated for this asset
  // (see `buildAssetNameplateSubmodel`) - `buildAssetShell` needs this to
  // keep including that submodel's reference on every later republish
  // (`publishAssetAas` runs on every ordinary asset edit, not just once).
  nameplateSubmodelGeneratedAt: Date | null;
};

export function assetShellId(assetId: string): string {
  return `${NAMESPACE}/aas/${assetId}`;
}

export function assetMetadataSubmodelId(assetId: string): string {
  return `${NAMESPACE}/sm/${assetId}/metadata`;
}

export function assetNameplateSubmodelId(assetId: string): string {
  return `${NAMESPACE}/sm/${assetId}/nameplate`;
}

function submodelReference(submodelId: string): Record<string, unknown> {
  return { type: "ModelReference", keys: [{ type: "Submodel", value: submodelId }] };
}

export function buildAssetShell(asset: PublishableAsset): Record<string, unknown> {
  const shellId = assetShellId(asset.id);
  const submodelRefs = [submodelReference(assetMetadataSubmodelId(asset.id))];
  if (asset.nameplateSubmodelGeneratedAt) {
    submodelRefs.push(submodelReference(assetNameplateSubmodelId(asset.id)));
  }
  return {
    modelType: "AssetAdministrationShell",
    id: shellId,
    idShort: asset.name,
    assetInformation: { assetKind: "Instance", globalAssetId: shellId },
    submodels: submodelRefs,
  };
}

function stringProperty(idShort: string, value: string): Record<string, unknown> {
  return { modelType: "Property", idShort, valueType: "xs:string", value };
}

export function buildAssetMetadataSubmodel(
  asset: PublishableAsset
): Record<string, unknown> {
  const submodelElements: Record<string, unknown>[] = [stringProperty("name", asset.name)];

  if (asset.description) {
    submodelElements.push(stringProperty("description", asset.description));
  }
  if (asset.structureNodeId) {
    submodelElements.push(stringProperty("structureNodeId", asset.structureNodeId));
  }
  if (asset.aasEndpointUrl) {
    submodelElements.push(stringProperty("linkedAasEndpointUrl", asset.aasEndpointUrl));
  }
  if (asset.aasGlobalAssetId) {
    submodelElements.push(stringProperty("linkedAasGlobalAssetId", asset.aasGlobalAssetId));
  }

  return {
    modelType: "Submodel",
    id: assetMetadataSubmodelId(asset.id),
    idShort: "AssetManagerMetadata",
    semanticId: {
      type: "ExternalReference",
      keys: [
        { type: "GlobalReference", value: `${NAMESPACE}/semanticIds/AssetManagerMetadata/1/0` },
      ],
    },
    submodelElements,
  };
}

// One IDTA Digital Nameplate v2.0 semanticId, so `lib/aas-nameplate.ts`'s
// `extractNameplateData` (keyed off `templateName`, resolved from this exact
// semanticId in `lib/aas.ts`'s `KNOWN_SUBMODEL_TEMPLATES`) recognizes and
// renders this the same as a manufacturer-authored Nameplate submodel.
const NAMEPLATE_SEMANTIC_ID = "https://admin-shell.io/zvei/nameplate/2/0/Nameplate";

export type NameplateManualFields = {
  manufacturerName: string | null;
  productDesignation: string | null;
  orderCode: string | null;
  serialNumber: string | null;
  yearOfConstruction: string | null;
  street: string | null;
  zipcode: string | null;
  cityTown: string | null;
  nationalCode: string | null;
};

/**
 * Builds a local, best-effort "Nameplate" submodel from manually-reviewed
 * OCR-guess fields (`lib/nameplate-generation-actions.ts`'s no-match
 * fallback path) - only used when the real product couldn't be identified
 * in a manufacturer's own AAS repository. Deliberately a smaller field set
 * than a real manufacturer's Nameplate (e.g. WAGO's, which includes many
 * eCl@ss-annotated fields no photo/manual entry would realistically
 * populate) - every field is optional and simply omitted when blank, same
 * philosophy as `lib/aas-nameplate.ts`'s display side.
 */
export function buildAssetNameplateSubmodel(
  assetId: string,
  fields: NameplateManualFields
): Record<string, unknown> {
  const submodelElements: Record<string, unknown>[] = [];
  if (fields.manufacturerName) {
    submodelElements.push(stringProperty("ManufacturerName", fields.manufacturerName));
  }
  if (fields.productDesignation) {
    submodelElements.push(
      stringProperty("ManufacturerProductDesignation", fields.productDesignation)
    );
  }
  if (fields.orderCode) {
    submodelElements.push(stringProperty("OrderCodeOfManufacturer", fields.orderCode));
  }
  if (fields.serialNumber) {
    submodelElements.push(stringProperty("SerialNumber", fields.serialNumber));
  }
  if (fields.yearOfConstruction) {
    submodelElements.push(stringProperty("YearOfConstruction", fields.yearOfConstruction));
  }

  const contactElements: Record<string, unknown>[] = [];
  if (fields.street) {
    contactElements.push(stringProperty("Street", fields.street));
  }
  if (fields.zipcode) {
    contactElements.push(stringProperty("Zipcode", fields.zipcode));
  }
  if (fields.cityTown) {
    contactElements.push(stringProperty("CityTown", fields.cityTown));
  }
  if (fields.nationalCode) {
    contactElements.push(stringProperty("NationalCode", fields.nationalCode));
  }
  if (contactElements.length > 0) {
    submodelElements.push({
      modelType: "SubmodelElementCollection",
      idShort: "ContactInformation",
      value: contactElements,
    });
  }

  return {
    modelType: "Submodel",
    id: assetNameplateSubmodelId(assetId),
    idShort: "Nameplate",
    semanticId: {
      type: "ExternalReference",
      keys: [{ type: "GlobalReference", value: NAMEPLATE_SEMANTIC_ID }],
    },
    submodelElements,
  };
}

export type PublishStatus = "published" | "publish-failed";

export async function publishAssetAas(asset: PublishableAsset): Promise<PublishStatus> {
  const status = await mirrorAasDataToLocalRepo({
    shell: buildAssetShell(asset),
    submodels: [buildAssetMetadataSubmodel(asset)],
  });
  return status === "mirrored" ? "published" : "publish-failed";
}

async function deleteQuietly(baseUrl: string, path: string): Promise<void> {
  try {
    await fetch(`${baseUrl}${path}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(DELETE_TIMEOUT_MS),
    });
  } catch {
    // Best effort - the Postgres delete is the action that matters.
  }
}

export async function unpublishAssetAas(assetId: string): Promise<void> {
  const localRepo = await ensureLocalMirrorRepository();
  await Promise.all([
    deleteQuietly(localRepo.baseUrl, `/submodels/${encodeAasId(assetMetadataSubmodelId(assetId))}`),
    // Best-effort regardless of whether a Nameplate submodel was ever
    // actually generated for this asset - deleting a resource that was
    // never created is a harmless no-op (`deleteQuietly` swallows errors).
    deleteQuietly(localRepo.baseUrl, `/submodels/${encodeAasId(assetNameplateSubmodelId(assetId))}`),
    deleteQuietly(localRepo.baseUrl, `/shells/${encodeAasId(assetShellId(assetId))}`),
  ]);
}
