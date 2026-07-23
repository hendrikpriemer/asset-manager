/**
 * Dispatches to the configured vision provider and tolerantly parses its
 * response into a structured guess - never throws, since this is only ever
 * used as a fallback when OCR already failed (`lib/nameplate-generation-
 * actions.ts`); a vision-API failure (bad key, network, quota, malformed
 * response) should fall back to the OCR guess, not break the feature.
 */

import type { VisionProviderConfig, VisionNameplateGuess } from "./types";
import { NAMEPLATE_EXTRACTION_PROMPT } from "./prompt";
import { callAnthropicVision } from "./anthropic-client";
import { callOpenAiVision } from "./openai-client";
import { callMistralVision } from "./mistral-client";

const EMPTY_GUESS: VisionNameplateGuess = { manufacturerName: null, articleNumber: null };

function callProvider(
  config: VisionProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  if (config.provider === "ANTHROPIC") {
    return callAnthropicVision(config, imageBase64, mimeType, prompt);
  }
  if (config.provider === "OPENAI") {
    return callOpenAiVision(config, imageBase64, mimeType, prompt);
  }
  return callMistralVision(config, imageBase64, mimeType, prompt);
}

/** Vision models sometimes wrap their JSON in prose or a markdown code fence despite instructions. */
function parseGuessFromResponseText(responseText: string): VisionNameplateGuess {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return EMPTY_GUESS;
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      manufacturerName:
        typeof parsed.manufacturerName === "string" ? parsed.manufacturerName : null,
      articleNumber: typeof parsed.articleNumber === "string" ? parsed.articleNumber : null,
    };
  } catch {
    return EMPTY_GUESS;
  }
}

export async function extractNameplateFieldsWithVision(
  config: VisionProviderConfig,
  imageBuffer: Buffer,
  mimeType: string
): Promise<VisionNameplateGuess> {
  try {
    const imageBase64 = imageBuffer.toString("base64");
    const responseText = await callProvider(
      config,
      imageBase64,
      mimeType,
      NAMEPLATE_EXTRACTION_PROMPT
    );
    return parseGuessFromResponseText(responseText);
  } catch {
    return EMPTY_GUESS;
  }
}
