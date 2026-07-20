import { describe, expect, it } from "vitest";
import {
  parseAasRepositoryInput,
  AasRepositoryValidationError,
} from "./aas-repository-schema";

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseAasRepositoryInput", () => {
  it("returns trimmed name and baseUrl when both are provided", () => {
    const formData = formDataWith({
      name: "  WAGO  ",
      baseUrl: "  https://c1.api.wago.com/smartdata-aas-env  ",
    });

    expect(parseAasRepositoryInput(formData)).toEqual({
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });
  });

  it("strips a trailing slash from the base URL", () => {
    const formData = formDataWith({
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env/",
    });

    expect(parseAasRepositoryInput(formData).baseUrl).toBe(
      "https://c1.api.wago.com/smartdata-aas-env"
    );
  });

  it("accepts an http:// base URL", () => {
    const formData = formDataWith({
      name: "Local BaSyx",
      baseUrl: "http://basyx-aas-env:8081",
    });

    expect(parseAasRepositoryInput(formData).baseUrl).toBe(
      "http://basyx-aas-env:8081"
    );
  });

  it("throws when name is missing", () => {
    const formData = formDataWith({ baseUrl: "https://example.com" });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      AasRepositoryValidationError
    );
    expect(() => parseAasRepositoryInput(formData)).toThrow(
      "Name is required."
    );
  });

  it("throws when name is whitespace only", () => {
    const formData = formDataWith({
      name: "   ",
      baseUrl: "https://example.com",
    });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      AasRepositoryValidationError
    );
  });

  it("throws when name exceeds the maximum length", () => {
    const formData = formDataWith({
      name: "a".repeat(201),
      baseUrl: "https://example.com",
    });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      "Name must be at most 200 characters."
    );
  });

  it("accepts a name at exactly the maximum length", () => {
    const name = "a".repeat(200);
    const formData = formDataWith({ name, baseUrl: "https://example.com" });

    expect(parseAasRepositoryInput(formData).name).toBe(name);
  });

  it("throws when baseUrl is missing", () => {
    const formData = formDataWith({ name: "WAGO" });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      "Base URL is required."
    );
  });

  it("throws when baseUrl is whitespace only", () => {
    const formData = formDataWith({ name: "WAGO", baseUrl: "   " });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      "Base URL is required."
    );
  });

  it("throws when baseUrl does not start with http:// or https://", () => {
    const formData = formDataWith({
      name: "WAGO",
      baseUrl: "ftp://example.com",
    });

    expect(() => parseAasRepositoryInput(formData)).toThrow(
      "Base URL must start with http:// or https://."
    );
  });
});
