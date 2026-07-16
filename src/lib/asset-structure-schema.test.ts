import { describe, expect, it } from "vitest";
import { AssetStructureLevel } from "@/generated/prisma/client";
import {
  parseStructureNodeInput,
  parseAddableLevel,
  AssetStructureValidationError,
  ADDABLE_LEVELS,
  LEVEL_LABELS,
} from "./asset-structure-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseStructureNodeInput", () => {
  it("returns trimmed name and description when both are provided", () => {
    const formData = formDataWith({
      name: "  Aventics Site Laatzen  ",
      description: "  Main manufacturing site  ",
    });

    expect(parseStructureNodeInput(formData)).toEqual({
      name: "Aventics Site Laatzen",
      description: "Main manufacturing site",
    });
  });

  it("returns a null description when description is omitted", () => {
    const formData = formDataWith({ name: "Scania Line" });

    expect(parseStructureNodeInput(formData)).toEqual({
      name: "Scania Line",
      description: null,
    });
  });

  it("returns a null description when description is whitespace only", () => {
    const formData = formDataWith({ name: "Scania Line", description: "   " });

    expect(parseStructureNodeInput(formData)).toEqual({
      name: "Scania Line",
      description: null,
    });
  });

  it("throws when name is missing", () => {
    const formData = new FormData();

    expect(() => parseStructureNodeInput(formData)).toThrow(
      AssetStructureValidationError
    );
    expect(() => parseStructureNodeInput(formData)).toThrow(
      "Name is required."
    );
  });

  it("throws when name is whitespace only", () => {
    const formData = formDataWith({ name: "   " });

    expect(() => parseStructureNodeInput(formData)).toThrow(
      AssetStructureValidationError
    );
  });

  it("throws when name exceeds the maximum length", () => {
    const formData = formDataWith({ name: "a".repeat(201) });

    expect(() => parseStructureNodeInput(formData)).toThrow(
      "Name must be at most 200 characters."
    );
  });

  it("accepts a name at exactly the maximum length", () => {
    const name = "a".repeat(200);
    const formData = formDataWith({ name });

    expect(parseStructureNodeInput(formData)).toEqual({
      name,
      description: null,
    });
  });
});

describe("parseAddableLevel", () => {
  it("returns the level when it is a valid addable level", () => {
    expect(parseAddableLevel("SITE")).toBe(AssetStructureLevel.SITE);
    expect(parseAddableLevel("EQUIPMENT")).toBe(AssetStructureLevel.EQUIPMENT);
  });

  it("throws for Enterprise (not an addable child level)", () => {
    expect(() => parseAddableLevel("ENTERPRISE")).toThrow(
      AssetStructureValidationError
    );
  });

  it("throws for a non-level string", () => {
    expect(() => parseAddableLevel("NOT_A_LEVEL")).toThrow(
      "Invalid level."
    );
  });

  it("throws for a non-string value", () => {
    expect(() => parseAddableLevel(null)).toThrow(AssetStructureValidationError);
  });
});

describe("level constants", () => {
  it("ADDABLE_LEVELS excludes Enterprise", () => {
    expect(ADDABLE_LEVELS).not.toContain(AssetStructureLevel.ENTERPRISE);
    expect(ADDABLE_LEVELS).toHaveLength(4);
  });

  it("LEVEL_LABELS has a human-readable label for every level", () => {
    expect(LEVEL_LABELS[AssetStructureLevel.WORK_CENTER]).toBe("Work Center");
    expect(LEVEL_LABELS[AssetStructureLevel.ENTERPRISE]).toBe("Enterprise");
  });
});
