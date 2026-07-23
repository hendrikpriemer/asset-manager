import { beforeEach, describe, expect, it, vi } from "vitest";

const { callAnthropicVision } = vi.hoisted(() => ({ callAnthropicVision: vi.fn() }));
const { callOpenAiVision } = vi.hoisted(() => ({ callOpenAiVision: vi.fn() }));
const { callMistralVision } = vi.hoisted(() => ({ callMistralVision: vi.fn() }));
vi.mock("./anthropic-client", () => ({ callAnthropicVision }));
vi.mock("./openai-client", () => ({ callOpenAiVision }));
vi.mock("./mistral-client", () => ({ callMistralVision }));

const { extractNameplateFieldsWithVision } = await import("./extract-nameplate-fields");

const anthropicConfig = { provider: "ANTHROPIC" as const, model: "claude-sonnet-5", apiKey: "key" };
const openAiConfig = { provider: "OPENAI" as const, model: "gpt-5.6", apiKey: "key" };
const mistralConfig = { provider: "MISTRAL" as const, model: "mistral-small-latest", apiKey: "key" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractNameplateFieldsWithVision", () => {
  it("dispatches to the Anthropic client for an ANTHROPIC config", async () => {
    callAnthropicVision.mockResolvedValue('{"manufacturerName":"WAGO","articleNumber":"750-451"}');

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("image-bytes"),
      "image/jpeg"
    );

    expect(callAnthropicVision).toHaveBeenCalledWith(
      anthropicConfig,
      Buffer.from("image-bytes").toString("base64"),
      "image/jpeg",
      expect.stringContaining("nameplate")
    );
    expect(result).toEqual({ manufacturerName: "WAGO", articleNumber: "750-451" });
  });

  it("dispatches to the OpenAI client for an OPENAI config", async () => {
    callOpenAiVision.mockResolvedValue('{"manufacturerName":"WAGO","articleNumber":"750-451"}');

    await extractNameplateFieldsWithVision(openAiConfig, Buffer.from("x"), "image/jpeg");

    expect(callOpenAiVision).toHaveBeenCalled();
    expect(callAnthropicVision).not.toHaveBeenCalled();
  });

  it("dispatches to the Mistral client for a MISTRAL config", async () => {
    callMistralVision.mockResolvedValue('{"manufacturerName":"WAGO","articleNumber":"750-451"}');

    await extractNameplateFieldsWithVision(mistralConfig, Buffer.from("x"), "image/jpeg");

    expect(callMistralVision).toHaveBeenCalled();
  });

  it("parses JSON wrapped in a markdown code fence", async () => {
    callAnthropicVision.mockResolvedValue(
      '```json\n{"manufacturerName":"WAGO","articleNumber":"750-451"}\n```'
    );

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("x"),
      "image/jpeg"
    );

    expect(result).toEqual({ manufacturerName: "WAGO", articleNumber: "750-451" });
  });

  it("defaults missing/non-string fields to null", async () => {
    callAnthropicVision.mockResolvedValue('{"manufacturerName":123}');

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("x"),
      "image/jpeg"
    );

    expect(result).toEqual({ manufacturerName: null, articleNumber: null });
  });

  it("returns an empty guess when the response has no JSON object at all", async () => {
    callAnthropicVision.mockResolvedValue("I cannot read this nameplate clearly.");

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("x"),
      "image/jpeg"
    );

    expect(result).toEqual({ manufacturerName: null, articleNumber: null });
  });

  it("returns an empty guess when the extracted JSON-like text fails to parse", async () => {
    callAnthropicVision.mockResolvedValue("{not valid json}");

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("x"),
      "image/jpeg"
    );

    expect(result).toEqual({ manufacturerName: null, articleNumber: null });
  });

  it("returns an empty guess instead of throwing when the provider call itself fails", async () => {
    callAnthropicVision.mockRejectedValue(new Error("network down"));

    const result = await extractNameplateFieldsWithVision(
      anthropicConfig,
      Buffer.from("x"),
      "image/jpeg"
    );

    expect(result).toEqual({ manufacturerName: null, articleNumber: null });
  });
});
