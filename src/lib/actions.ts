"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAssetInput, AssetValidationError } from "@/lib/asset-schema";
import { parseAssetImage, AssetImageValidationError } from "@/lib/asset-images";
import { reindexAssetAas, type ReindexResult } from "@/lib/aas-reindex";

export type ActionState = { error: string | null };

/**
 * Applies a reindex result to the fields to persist: a removed reference
 * clears the index, a successful fetch refreshes it, and a failed fetch
 * leaves the previous value alone (the fields are simply omitted, so an
 * `update` doesn't touch them - a transient outage at the AAS repository
 * shouldn't wipe out the last known-good search index).
 */
function aasIndexUpdateData(
  result: ReindexResult
): { aasSearchText?: string | null; aasSearchIndexedAt?: Date | null } {
  if (result.status === "no-reference") {
    return { aasSearchText: null, aasSearchIndexedAt: null };
  }
  if (result.status === "ok") {
    return { aasSearchText: result.text, aasSearchIndexedAt: new Date() };
  }
  return {};
}

export async function createAsset(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseAssetInput(formData);
  } catch (error) {
    if (error instanceof AssetValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  let assetImage;
  let nameplateImage;
  try {
    assetImage = await parseAssetImage(formData, "assetImage", "Asset photo");
    nameplateImage = await parseAssetImage(
      formData,
      "nameplateImage",
      "Nameplate photo"
    );
  } catch (error) {
    if (error instanceof AssetImageValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const reindexResult = await reindexAssetAas({
    aasEndpointUrl: input.aasEndpointUrl,
    aasGlobalAssetId: input.aasGlobalAssetId,
  });

  await prisma.asset.create({
    data: {
      ...input,
      assetImage: assetImage?.data ?? null,
      assetImageType: assetImage?.type ?? null,
      nameplateImage: nameplateImage?.data ?? null,
      nameplateImageType: nameplateImage?.type ?? null,
      ...aasIndexUpdateData(reindexResult),
    },
  });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
  return { error: null };
}

export async function updateAsset(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseAssetInput(formData);
  } catch (error) {
    if (error instanceof AssetValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  let assetImage;
  let nameplateImage;
  try {
    assetImage = await parseAssetImage(formData, "assetImage", "Asset photo");
    nameplateImage = await parseAssetImage(
      formData,
      "nameplateImage",
      "Nameplate photo"
    );
  } catch (error) {
    if (error instanceof AssetImageValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const data: typeof input & {
    assetImage?: Uint8Array<ArrayBuffer> | null;
    assetImageType?: string | null;
    nameplateImage?: Uint8Array<ArrayBuffer> | null;
    nameplateImageType?: string | null;
    aasSearchText?: string | null;
    aasSearchIndexedAt?: Date | null;
  } = { ...input };

  if (assetImage) {
    data.assetImage = assetImage.data;
    data.assetImageType = assetImage.type;
  } else if (formData.get("assetImageRemoved") === "true") {
    data.assetImage = null;
    data.assetImageType = null;
  }

  if (nameplateImage) {
    data.nameplateImage = nameplateImage.data;
    data.nameplateImageType = nameplateImage.type;
  } else if (formData.get("nameplateImageRemoved") === "true") {
    data.nameplateImage = null;
    data.nameplateImageType = null;
  }

  const reindexResult = await reindexAssetAas({
    aasEndpointUrl: input.aasEndpointUrl,
    aasGlobalAssetId: input.aasGlobalAssetId,
  });
  Object.assign(data, aasIndexUpdateData(reindexResult));

  await prisma.asset.update({ where: { id }, data });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
  return { error: null };
}

export async function deleteAsset(id: string): Promise<void> {
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
}

export type RefreshAasSearchIndexResult = {
  error: string | null;
  mirrorWarning: string | null;
};

export async function refreshAasSearchIndex(
  assetId: string
): Promise<RefreshAasSearchIndexResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { aasEndpointUrl: true, aasGlobalAssetId: true },
  });
  if (!asset) {
    return { error: "Asset not found.", mirrorWarning: null };
  }

  const result = await reindexAssetAas(asset);

  if (result.status === "no-reference") {
    return { error: "This asset has no AAS reference to index.", mirrorWarning: null };
  }
  if (result.status === "failed") {
    return {
      error: "Could not reach the configured AAS repository.",
      mirrorWarning: null,
    };
  }

  await prisma.asset.update({
    where: { id: assetId },
    data: { aasSearchText: result.text, aasSearchIndexedAt: new Date() },
  });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");

  return {
    error: null,
    mirrorWarning:
      result.mirror === "mirror-failed"
        ? "Search index updated, but mirroring to the local AAS repository failed."
        : null,
  };
}
