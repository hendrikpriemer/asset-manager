import { beforeEach, describe, expect, it, vi } from "vitest";

const { testAnthropicConnection } = vi.hoisted(() => ({ testAnthropicConnection: vi.fn() }));
const { testOpenAiConnection } = vi.hoisted(() => ({ testOpenAiConnection: vi.fn() }));
const { testMistralConnection } = vi.hoisted(() => ({ testMistralConnection: vi.fn() }));
vi.mock("./anthropic-client", () => ({ testAnthropicConnection }));
vi.mock("./openai-client", () => ({ testOpenAiConnection }));
vi.mock("./mistral-client", () => ({ testMistralConnection }));

const { testVisionProviderConnection } = await import("./test-connection");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("testVisionProviderConnection", () => {
  it("dispatches to the Anthropic client", async () => {
    testAnthropicConnection.mockResolvedValue(true);

    const config = { provider: "ANTHROPIC" as const, model: "claude-sonnet-5", apiKey: "key" };
    await expect(testVisionProviderConnection(config)).resolves.toBe(true);
    expect(testAnthropicConnection).toHaveBeenCalledWith(config);
  });

  it("dispatches to the OpenAI client", async () => {
    testOpenAiConnection.mockResolvedValue(false);

    const config = { provider: "OPENAI" as const, model: "gpt-5.6", apiKey: "key" };
    await expect(testVisionProviderConnection(config)).resolves.toBe(false);
    expect(testOpenAiConnection).toHaveBeenCalledWith(config);
  });

  it("dispatches to the Mistral client", async () => {
    testMistralConnection.mockResolvedValue(true);

    const config = { provider: "MISTRAL" as const, model: "mistral-small-latest", apiKey: "key" };
    await expect(testVisionProviderConnection(config)).resolves.toBe(true);
    expect(testMistralConnection).toHaveBeenCalledWith(config);
  });
});
