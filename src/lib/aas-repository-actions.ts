"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  parseAasRepositoryInput,
  AasRepositoryValidationError,
} from "@/lib/aas-repository-schema";

export type ActionState = { error: string | null };

const SETTINGS_PATH = "/settings/aas-repositories";
const LOCAL_MIRROR_MANAGED_MESSAGE =
  "The local AAS mirror is managed by the platform and can't be edited or deleted.";

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

  const target = await prisma.aasRepository.findUnique({ where: { id } });
  if (target?.isLocalMirror) {
    return { error: LOCAL_MIRROR_MANAGED_MESSAGE };
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
  const target = await prisma.aasRepository.findUnique({ where: { id } });
  if (target?.isLocalMirror) {
    throw new Error(LOCAL_MIRROR_MANAGED_MESSAGE);
  }

  await prisma.aasRepository.delete({ where: { id } });
  revalidatePath(SETTINGS_PATH);
}

const CONNECTION_TEST_TIMEOUT_MS = 5000;
// A single slow/stalled response from a third-party AAS repository (seen
// live against WAGO's Cloudflare-fronted backend: headers arrived but the
// body never did) shouldn't be reported as "unreachable" - one retry after a
// short pause is usually enough to tell a transient hiccup from a real
// outage.
const RETRY_DELAY_MS = 1500;

export type AasRepositoryConnectionResult =
  | { status: "reachable" }
  | { status: "unreachable" };

async function attemptConnection(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/shells?limit=1`, {
      signal: AbortSignal.timeout(CONNECTION_TEST_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function testAasRepositoryConnection(
  baseUrl: string
): Promise<AasRepositoryConnectionResult> {
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return { status: "unreachable" };
  }

  if (await attemptConnection(trimmed)) {
    return { status: "reachable" };
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return (await attemptConnection(trimmed))
    ? { status: "reachable" }
    : { status: "unreachable" };
}
