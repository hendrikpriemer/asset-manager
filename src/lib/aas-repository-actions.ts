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

export async function deleteAasRepository(id: string): Promise<void> {
  await prisma.aasRepository.delete({ where: { id } });
  revalidatePath(SETTINGS_PATH);
}
