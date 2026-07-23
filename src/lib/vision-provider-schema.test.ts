import { describe, expect, it } from "vitest";
import { parseVisionProviderInput, VisionProviderValidationError } from "./vision-provider-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseVisionProviderInput", () => {
  it("returns the provider, trimmed model, and trimmed API key when all are valid", () => {
    const formData = formDataWith({
      provider: "ANTHROPIC",
      model: "  claude-sonnet-5  ",
      apiKey: "  sk-ant-test  ",
    });

    expect(parseVisionProviderInput(formData)).toEqual({
      provider: "ANTHROPIC",
      model: "claude-sonnet-5",
      apiKey: "sk-ant-test",
    });
  });

  it.each(["ANTHROPIC", "OPENAI", "MISTRAL"])("accepts the valid provider %s", (provider) => {
    const formData = formDataWith({ provider, model: "some-model", apiKey: "key" });

    expect(parseVisionProviderInput(formData).provider).toBe(provider);
  });

  it("throws when the provider is missing", () => {
    const formData = formDataWith({ model: "some-model", apiKey: "key" });

    expect(() => parseVisionProviderInput(formData)).toThrow(VisionProviderValidationError);
  });

  it("throws when the provider is not one of the known values", () => {
    const formData = formDataWith({ provider: "GEMINI", model: "some-model", apiKey: "key" });

    expect(() => parseVisionProviderInput(formData)).toThrow(
      "Please choose a valid vision provider."
    );
  });

  it("throws when model is missing", () => {
    const formData = formDataWith({ provider: "ANTHROPIC", apiKey: "key" });

    expect(() => parseVisionProviderInput(formData)).toThrow("Model is required.");
  });

  it("throws when model is blank after trimming", () => {
    const formData = formDataWith({ provider: "ANTHROPIC", model: "   ", apiKey: "key" });

    expect(() => parseVisionProviderInput(formData)).toThrow("Model is required.");
  });

  it("returns a blank API key when none is given (meaning: keep the existing one)", () => {
    const formData = formDataWith({ provider: "ANTHROPIC", model: "some-model" });

    expect(parseVisionProviderInput(formData).apiKey).toBe("");
  });

  it("returns a blank API key when it is blank after trimming", () => {
    const formData = formDataWith({ provider: "ANTHROPIC", model: "some-model", apiKey: "   " });

    expect(parseVisionProviderInput(formData).apiKey).toBe("");
  });
});
