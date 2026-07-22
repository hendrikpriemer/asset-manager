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
};

export function assetShellId(assetId: string): string {
  return `${NAMESPACE}/aas/${assetId}`;
}

export function assetMetadataSubmodelId(assetId: string): string {
  return `${NAMESPACE}/sm/${assetId}/metadata`;
}

export function buildAssetShell(asset: PublishableAsset): Record<string, unknown> {
  const shellId = assetShellId(asset.id);
  return {
    modelType: "AssetAdministrationShell",
    id: shellId,
    idShort: asset.name,
    assetInformation: { assetKind: "Instance", globalAssetId: shellId },
    submodels: [
      {
        type: "ModelReference",
        keys: [{ type: "Submodel", value: assetMetadataSubmodelId(asset.id) }],
      },
    ],
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
    deleteQuietly(localRepo.baseUrl, `/shells/${encodeAasId(assetShellId(assetId))}`),
  ]);
}
