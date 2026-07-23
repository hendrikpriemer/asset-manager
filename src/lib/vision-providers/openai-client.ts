/**
 * Confirmed live against OpenAI's current vision docs (not guessed): an
 * image is a `{type:"image_url", image_url:{url:"data:{mime};base64,{data}"}}`
 * content part alongside a `{type:"text"}` part; the response text is
 * `choices[0].message.content`.
 */

import type { VisionProviderConfig } from "./types";

const TIMEOUT_MS = 30_000;

export async function callOpenAiVision(
  config: VisionProviderConfig,
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed with status ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI API response did not contain message content.");
  }
  return text;
}

/** A minimal, text-only request (no image) - just enough to validate the API key/model work. */
export async function testOpenAiConnection(config: VisionProviderConfig): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
