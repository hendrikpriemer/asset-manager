import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const LOCAL_MIRROR_NAME = "Local AAS Mirror";

/**
 * The local AAS mirror isn't a repository users create - it's a fixed part
 * of the platform (the docker-compose-managed `basyx-aas-env`). This makes
 * sure exactly one repository row has `isLocalMirror: true` and points at
 * `LOCAL_AAS_MIRROR_URL`, self-healing if the row is missing or its baseUrl
 * has drifted, without needing a seed script or a fixed id.
 */
export async function ensureLocalMirrorRepository() {
  const mirrorUrl = process.env.LOCAL_AAS_MIRROR_URL || "http://basyx-aas-env:8081";

  const existingMirror = await prisma.aasRepository.findFirst({
    where: { isLocalMirror: true },
  });
  if (existingMirror) {
    if (existingMirror.baseUrl === mirrorUrl) {
      return existingMirror;
    }
    return prisma.aasRepository.update({
      where: { id: existingMirror.id },
      data: { baseUrl: mirrorUrl },
    });
  }

  const matchingByUrl = await prisma.aasRepository.findFirst({
    where: { baseUrl: mirrorUrl },
  });
  if (matchingByUrl) {
    return prisma.aasRepository.update({
      where: { id: matchingByUrl.id },
      data: { name: LOCAL_MIRROR_NAME, isLocalMirror: true },
    });
  }

  return prisma.aasRepository.create({
    data: { name: LOCAL_MIRROR_NAME, baseUrl: mirrorUrl, isLocalMirror: true },
  });
}

export async function getAasRepositories() {
  await ensureLocalMirrorRepository();
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
