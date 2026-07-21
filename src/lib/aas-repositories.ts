import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export function getAasRepositories() {
  return prisma.aasRepository.findMany({ orderBy: { name: "asc" } });
}

export function getAasRepositoryById(id: string) {
  return prisma.aasRepository.findUnique({ where: { id } });
}

export async function getAasRepositoryByIdOrNotFound(id: string) {
  const repository = await getAasRepositoryById(id);
  if (!repository) {
    notFound();
  }
  return repository;
}
