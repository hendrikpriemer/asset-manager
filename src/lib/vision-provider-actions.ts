"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  parseVisionProviderInput,
  VisionProviderValidationError,
} from "@/lib/vision-provider-schema";
import { encryptSecret } from "@/lib/secret-encryption";
import { testVisionProviderConnection as sendConnectionTestRequest } from "@/lib/vision-providers/test-connection";
import type { VisionProviderType } from "@/lib/vision-providers/types";

export type ActionState = { error: string | null };

const SETTINGS_PATH = "/settings/vision-provider";

export async function saveVisionProviderSetting(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  let input;
  try {
    input = parseVisionProviderInput(formData);
  } catch (error) {
    if (error instanceof VisionProviderValidationError) {
      return { error: error.message };
    }
    throw error;
  }

  const existing = await prisma.visionProviderSetting.findFirst();
  if (!input.apiKey && !existing) {
    return { error: "API key is required." };
  }
  const encryptedApiKey = input.apiKey ? encryptSecret(input.apiKey) : existing!.encryptedApiKey;

  if (existing) {
    await prisma.visionProviderSetting.update({
      where: { id: existing.id },
      data: { provider: input.provider, model: input.model, encryptedApiKey },
    });
  } else {
    await prisma.visionProviderSetting.create({
      data: { provider: input.provider, model: input.model, encryptedApiKey },
    });
  }

  revalidatePath(SETTINGS_PATH);
  return { error: null };
}

export async function deleteVisionProviderSetting(): Promise<void> {
  const existing = await prisma.visionProviderSetting.findFirst();
  if (existing) {
    await prisma.visionProviderSetting.delete({ where: { id: existing.id } });
  }
  revalidatePath(SETTINGS_PATH);
}

export type VisionProviderConnectionResult = { status: "reachable" } | { status: "unreachable" };

/** Tests against the form's current (not-yet-saved) values - mirrors `testAasRepositoryConnection`. */
export async function testVisionProviderConnection(
  provider: VisionProviderType,
  model: string,
  apiKey: string
): Promise<VisionProviderConnectionResult> {
  const reachable = await sendConnectionTestRequest({ provider, model, apiKey });
  return { status: reachable ? "reachable" : "unreachable" };
}
