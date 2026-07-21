"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  parseAasRepositoryInput,
  AasRepositoryValidationError,
} from "@/lib/aas-repository-schema";

export type ActionState = { error: string | null };

const SETTINGS_PATH = "/settings/aas-repositories";

export async function createAasRepository(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseAasRepositoryInput(formData);
  } catch (error) {
    if (error instanceof AasRepositoryValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const existing = await prisma.aasRepository.findUnique({
    where: { baseUrl: input.baseUrl },
  });
  if (existing) {
    return { error: "A repository with this base URL is already configured." };
  }

  await prisma.aasRepository.create({ data: input });
  revalidatePath(SETTINGS_PATH);
  return { error: null };
}

export async function updateAasRepository(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseAasRepositoryInput(formData);
  } catch (error) {
    if (error instanceof AasRepositoryValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const existing = await prisma.aasRepository.findUnique({
    where: { baseUrl: input.baseUrl },
  });
  if (existing && existing.id !== id) {
    return { error: "A repository with this base URL is already configured." };
  }

  await prisma.aasRepository.update({ where: { id }, data: input });
  revalidatePath(SETTINGS_PATH);
  return { error: null };
}

export async function deleteAasRepository(id: string): Promise<void> {
  await prisma.aasRepository.delete({ where: { id } });
  revalidatePath(SETTINGS_PATH);
}

const CONNECTION_TEST_TIMEOUT_MS = 5000;

export type AasRepositoryConnectionResult =
  | { status: "reachable" }
  | { status: "unreachable" };

export async function testAasRepositoryConnection(
  baseUrl: string
): Promise<AasRepositoryConnectionResult> {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return { status: "unreachable" };
  }

  try {
    const response = await fetch(`${trimmed}/shells?limit=1`, {
      signal: AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS),
    });
    return response.ok ? { status: "reachable" } : { status: "unreachable" };
  } catch {
    return { status: "unreachable" };
  }
}
