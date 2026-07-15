import { describe, expect, it } from "vitest";
import { parseAssetInput, AssetValidationError } from "./asset-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseAssetInput", () => {
  it("returns trimmed name and description when both are provided", () => {
    const formData = formDataWith({
      name: "  Laptop  ",
      description: "  A work laptop  ",
    });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: "A work laptop",
    });
  });

  it("returns a null description when description is omitted", () => {
    const formData = formDataWith({ name: "Laptop" });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
    });
  });

  it("returns a null description when description is whitespace only", () => {
    const formData = formDataWith({ name: "Laptop", description: "   " });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
    });
  });

  it("throws when name is missing", () => {
    const formData = new FormData();

    expect(() => parseAssetInput(formData)).toThrow(AssetValidationError);
    expect(() => parseAssetInput(formData)).toThrow("Name is required.");
  });

  it("throws when name is whitespace only", () => {
    const formData = formDataWith({ name: "   " });

    expect(() => parseAssetInput(formData)).toThrow(AssetValidationError);
  });

  it("throws when name exceeds the maximum length", () => {
    const formData = formDataWith({ name: "a".repeat(201) });

    expect(() => parseAssetInput(formData)).toThrow(
      "Name must be at most 200 characters."
    );
  });

  it("accepts a name at exactly the maximum length", () => {
    const name = "a".repeat(200);
    const formData = formDataWith({ name });

    expect(parseAssetInput(formData)).toEqual({ name, description: null });
  });
});
