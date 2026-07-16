"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  parseStructureNodeInput,
  parseAddableLevel,
  AssetStructureValidationError,
} from "@/lib/asset-structure-schema";
import { getStructureRoot } from "@/lib/asset-structure";
import { AssetStructureLevel } from "@/generated/prisma/client";

export type ActionState = { error: string | null };

const STRUCTURE_PATH = "/asset-structure";

export async function createAssetStructureRoot(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseStructureNodeInput(formData);
  } catch (error) {
    if (error instanceof AssetStructureValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const existingRoot = await getStructureRoot();
  if (existingRoot) {
    return { error: "An asset structure already exists." };
  }

  await prisma.assetStructureNode.create({
    data: { ...input, level: AssetStructureLevel.ENTERPRISE, position: 0 },
  });
  revalidatePath(STRUCTURE_PATH, "layout");
  return { error: null };
}

export async function createStructureNode(
  parentId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let level;
  let input;
  try {
    level = parseAddableLevel(formData.get("level"));
    input = parseStructureNodeInput(formData);
  } catch (error) {
    if (error instanceof AssetStructureValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const siblingCount = await prisma.assetStructureNode.count({
    where: { parentId },
  });
  await prisma.assetStructureNode.create({
    data: { ...input, level, parentId, position: siblingCount },
  });
  revalidatePath(STRUCTURE_PATH, "layout");
  return { error: null };
}

export async function updateStructureNode(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseStructureNodeInput(formData);
  } catch (error) {
    if (error instanceof AssetStructureValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  await prisma.assetStructureNode.update({ where: { id }, data: input });
  revalidatePath(STRUCTURE_PATH, "layout");
  return { error: null };
}

export async function deleteStructureNode(id: string): Promise<void> {
  await prisma.assetStructureNode.delete({ where: { id } });
  revalidatePath(STRUCTURE_PATH, "layout");
  revalidatePath("/assets");
}

async function moveStructureNode(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  const node = await prisma.assetStructureNode.findUnique({ where: { id } });
  if (!node) return;

  const siblings = await prisma.assetStructureNode.findMany({
    where: { parentId: node.parentId },
    orderBy: { position: "asc" },
  });
  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await prisma.$transaction([
    prisma.assetStructureNode.update({
      where: { id: node.id },
      data: { position: swapWith.position },
    }),
    prisma.assetStructureNode.update({
      where: { id: swapWith.id },
      data: { position: node.position },
    }),
  ]);
  revalidatePath(STRUCTURE_PATH, "layout");
}

export async function moveStructureNodeUp(id: string): Promise<void> {
  await moveStructureNode(id, "up");
}

export async function moveStructureNodeDown(id: string): Promise<void> {
  await moveStructureNode(id, "down");
}
