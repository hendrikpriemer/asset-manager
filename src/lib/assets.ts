import { prisma } from "@/lib/prisma";

export function getAssets() {
  return prisma.asset.findMany({ orderBy: { updatedAt: "desc" } });
}

export function getAssetById(id: string) {
  return prisma.asset.findUnique({ where: { id } });
}
