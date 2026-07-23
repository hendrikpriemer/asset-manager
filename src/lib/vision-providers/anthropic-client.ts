/**
 * Confirmed live against Anthropic's current Messages API docs (not
 * guessed): an image is a `{type:"image", source:{type:"base64",
 * media_type, data}}` content block alongside a `{type:"text"}` block;
 * the response text is `content[0].text`.
 */

import type { VisionProviderConfig } from "./types";

const TIMEOUT_MS = 30_000;

export async function callAnthropicVision(
  config: VisionProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic API response did not contain text content.");
  }
  return text;
}

/** A minimal, text-only request (no image) - just enough to validate the API key/model work. */
export async function testAnthropicConnection(config: VisionProviderConfig): Promise<boolean> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 8,
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
