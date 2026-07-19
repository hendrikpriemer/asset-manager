"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAssetInput, AssetValidationError } from "@/lib/asset-schema";
import { parseAssetImage, AssetImageValidationError } from "@/lib/asset-images";

export type ActionState = { error: string | null };

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

  await prisma.asset.create({
    data: {
      ...input,
      assetImage: assetImage?.data ?? null,
      assetImageType: assetImage?.type ?? null,
      nameplateImage: nameplateImage?.data ?? null,
      nameplateImageType: nameplateImage?.type ?? null,
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
