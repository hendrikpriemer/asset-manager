import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export function getAssets() {
  return prisma.asset.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getAssetById(id: string) {
  return prisma.asset.findUnique({ where: { id } });
}

export async function getAssetByIdOrNotFound(id: string) {
  const asset = await getAssetById(id);
  if (!asset) {
    notFound();
  }
  return asset;
}
