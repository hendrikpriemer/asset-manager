import type { VisionProviderType } from "@/lib/vision-providers/types";

export class VisionProviderValidationError extends Error {}

export type VisionProviderInput = {
  provider: VisionProviderType;
  model: string;
  // Blank means "keep the currently-saved key" (the Settings form never
  // shows/re-sends the real stored key) - only meaningful when a setting
  // already exists; lib/vision-provider-actions.ts enforces that a first-
  // time save must include one.
  apiKey: string;
};

const VALID_PROVIDERS: VisionProviderType[] = ["ANTHROPIC", "OPENAI", "MISTRAL"];

function isValidProvider(value: string): value is VisionProviderType {
  return (VALID_PROVIDERS as string[]).includes(value);
}

export function parseVisionProviderInput(formData: FormData): VisionProviderInput {
  const rawProvider = formData.get("provider");
  const provider = typeof rawProvider === "string" ? rawProvider : "";
  if (!isValidProvider(provider)) {
    throw new VisionProviderValidationError("Please choose a valid vision provider.");
  }

  const rawModel = formData.get("model");
  const model = typeof rawModel === "string" ? rawModel.trim() : "";
  if (!model) {
    throw new VisionProviderValidationError("Model is required.");
  }

  const rawApiKey = formData.get("apiKey");
  const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";

  return { provider, model, apiKey };
}
