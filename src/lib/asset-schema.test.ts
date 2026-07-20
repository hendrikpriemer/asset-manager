import { describe, expect, it } from "vitest";
import {
  parseAssetInput,
  classifyAasReference,
  AssetValidationError,
} from "./asset-schema";

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
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("returns a null description when description is omitted", () => {
    const formData = formDataWith({ name: "Laptop" });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("returns a null description when description is whitespace only", () => {
    const formData = formDataWith({ name: "Laptop", description: "   " });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("returns the selected structureNodeId when one is provided", () => {
    const formData = formDataWith({ name: "Laptop", structureNodeId: "node-1" });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: "node-1",
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("returns a null structureNodeId when the field is an empty string (Unassigned)", () => {
    const formData = formDataWith({ name: "Laptop", structureNodeId: "" });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("classifies an aasReference containing /shells/ as an endpoint URL", () => {
    const formData = formDataWith({
      name: "Laptop",
      aasReference: "  http://example.com/shells/abc  ",
    });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });
  });

  it("classifies an aasReference without /shells/ as a globalAssetId", () => {
    const formData = formDataWith({
      name: "Laptop",
      aasReference: "  https://example.com/assets/abc  ",
    });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: "https://example.com/assets/abc",
    });
  });

  it("returns null aasEndpointUrl and aasGlobalAssetId when aasReference is omitted or whitespace only", () => {
    const formData = formDataWith({ name: "Laptop", aasReference: "   " });

    expect(parseAssetInput(formData)).toEqual({
      name: "Laptop",
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
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

    expect(parseAssetInput(formData)).toEqual({
      name,
      description: null,
      structureNodeId: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });
});

describe("classifyAasReference", () => {
  it("returns both null for an empty string", () => {
    expect(classifyAasReference("")).toEqual({
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("returns both null for whitespace only", () => {
    expect(classifyAasReference("   ")).toEqual({
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
  });

  it("classifies a value containing /shells/ as an endpoint URL", () => {
    expect(
      classifyAasReference("http://example.com/shells/abc")
    ).toEqual({
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });
  });

  it("classifies a value without /shells/ as a globalAssetId", () => {
    expect(classifyAasReference("https://example.com/assets/abc")).toEqual({
      aasEndpointUrl: null,
      aasGlobalAssetId: "https://example.com/assets/abc",
    });
  });

  it("trims the value before classifying and returning it", () => {
    expect(classifyAasReference("  https://example.com/assets/abc  ")).toEqual({
      aasEndpointUrl: null,
      aasGlobalAssetId: "https://example.com/assets/abc",
    });
  });
});
