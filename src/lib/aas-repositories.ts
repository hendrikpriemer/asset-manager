import { prisma } from "@/lib/prisma";

export function getAasRepositories() {
  return prisma.aasRepository.findMany({ orderBy: { name: "asc" } });
}
