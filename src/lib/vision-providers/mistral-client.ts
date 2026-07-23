/**
 * Mistral's chat completions API is structurally OpenAI-compatible. Its docs
 * confirm the URL-based image form (`image_url` as a bare string, e.g.
 * `"image_url": "https://example.com/image.jpg"` - notably NOT wrapped in
 * `{url: ...}` like OpenAI's), but don't show the exact base64 data-URI
 * syntax explicitly. This mirrors the URL form (bare string) for base64 too,
 * on the assumption it's the same field just given a `data:` URI instead of
 * an `https:` one - **not yet live-verified against a real Mistral API key**,
 * unlike the Anthropic/OpenAI clients. Confirm this the first time a real
 * Mistral key is available.
 */

import type { VisionProviderConfig } from "./types";

const TIMEOUT_MS = 30_000;

export async function callMistralVision(
  config: VisionProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: `data:${mimeType};base64,${imageBase64}` },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Mistral API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("Mistral API response did not contain message content.");
  }
  return text;
}

/** A minimal, text-only request (no image) - just enough to validate the API key/model work. */
export async function testMistralConnection(config: VisionProviderConfig): Promise<boolean> {
  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
