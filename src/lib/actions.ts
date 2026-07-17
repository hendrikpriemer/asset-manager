"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAssetInput, AssetValidationError } from "@/lib/asset-schema";

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

  await prisma.asset.create({ data: input });
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

  await prisma.asset.update({ where: { id }, data: input });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
  return { error: null };
}

export async function deleteAsset(id: string): Promise<void> {
  await prisma.asset.delete({ where: { id } });
  revalidatePath("/asset-structure/table");
  revalidatePath("/asset-structure", "layout");
}
