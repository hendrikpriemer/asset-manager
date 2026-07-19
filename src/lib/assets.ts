import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const OMIT_IMAGE_BYTES = { assetImage: true, nameplateImage: true } as const;

export function getAssets() {
  return prisma.asset.findMany({
    orderBy: { updatedAt: "desc" },
    omit: OMIT_IMAGE_BYTES,
  });
}

export function getAssetCount() {
  return prisma.asset.count();
}

export function getAssetById(id: string) {
  return prisma.asset.findUnique({ where: { id }, omit: OMIT_IMAGE_BYTES });
}

export async function getAssetByIdOrNotFound(id: string) {
  const asset = await getAssetById(id);
  if (!asset) {
    notFound();
  }
  return asset;
}
