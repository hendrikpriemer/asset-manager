/**
 * Read-only queries for the (singleton, at most one row) vision-provider
 * configuration - see `prisma/schema.prisma`'s `VisionProviderSetting` and
 * `lib/vision-provider-actions.ts` for the mutating Server Actions.
 */

import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-encryption";
import type { VisionProviderConfig, VisionProviderType } from "@/lib/vision-providers/types";

export type VisionProviderSettingSummary = {
  provider: VisionProviderType;
  model: string;
};

/** Never exposes the decrypted API key - only enough for the Settings UI to display. */
export async function getVisionProviderSetting(): Promise<VisionProviderSettingSummary | null> {
  const setting = await prisma.visionProviderSetting.findFirst();
  return setting ? { provider: setting.provider, model: setting.model } : null;
}

/** Internal use only (the actual vision-API call site) - never returned to the client. */
export async function getDecryptedVisionProviderConfig(): Promise<VisionProviderConfig | null> {
  const setting = await prisma.visionProviderSetting.findFirst();
  if (!setting) {
    return null;
  }
  return {
    provider: setting.provider,
    model: setting.model,
    apiKey: decryptSecret(setting.encryptedApiKey),
  };
}
