import type { VisionProviderConfig } from "./types";
import { testAnthropicConnection } from "./anthropic-client";
import { testOpenAiConnection } from "./openai-client";
import { testMistralConnection } from "./mistral-client";

export function testVisionProviderConnection(config: VisionProviderConfig): Promise<boolean> {
  if (config.provider === "ANTHROPIC") {
    return testAnthropicConnection(config);
  }
  if (config.provider === "OPENAI") {
    return testOpenAiConnection(config);
  }
  return testMistralConnection(config);
}
