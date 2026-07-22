import { describe, expect, it } from "vitest";
import {
  detectModel3DFormat,
  isImageContentType,
  isPdfContentType,
  isPreviewableContentType,
} from "./file-preview";

describe("detectModel3DFormat", () => {
  it("returns null for a null contentType", () => {
    expect(detectModel3DFormat(null)).toBeNull();
  });

  it("recognizes application/step", () => {
    expect(detectModel3DFormat("application/step")).toBe("step");
  });

  it.each([
    "application/sla",
    "application/vnd.ms-pki.stl",
    "application/stl",
    "model/stl",
    "text/stl",
    "text/x-stl",
    "text/x-sla",
  ])("recognizes the STL content type %s", (contentType) => {
    expect(detectModel3DFormat(contentType)).toBe("stl");
  });

  it("recognizes application/obj", () => {
    expect(detectModel3DFormat("application/obj")).toBe("obj");
  });

  it.each(["model/gltf+json", "model/gltf-binary"])(
    "recognizes the glTF content type %s",
    (contentType) => {
      expect(detectModel3DFormat(contentType)).toBe("gltf");
    }
  );

  it("is case-insensitive", () => {
    expect(detectModel3DFormat("APPLICATION/STEP")).toBe("step");
  });

  it("returns null for an unrecognized content type", () => {
    expect(detectModel3DFormat("application/pdf")).toBeNull();
  });
});

describe("isPdfContentType", () => {
  it("recognizes application/pdf case-insensitively", () => {
    expect(isPdfContentType("application/pdf")).toBe(true);
    expect(isPdfContentType("APPLICATION/PDF")).toBe(true);
  });

  it("returns false for null or a non-PDF content type", () => {
    expect(isPdfContentType(null)).toBe(false);
    expect(isPdfContentType("application/step")).toBe(false);
  });
});

describe("isImageContentType", () => {
  it.each(["image/png", "image/jpeg", "IMAGE/PNG", "image/svg+xml"])(
    "recognizes the image content type %s",
    (contentType) => {
      expect(isImageContentType(contentType)).toBe(true);
    }
  );

  it("returns false for null or a non-image content type", () => {
    expect(isImageContentType(null)).toBe(false);
    expect(isImageContentType("application/pdf")).toBe(false);
  });
});

describe("isPreviewableContentType", () => {
  it("is true for PDF and 3D content types", () => {
    expect(isPreviewableContentType("application/pdf")).toBe(true);
    expect(isPreviewableContentType("application/step")).toBe(true);
  });

  it("is false for null or an unrecognized content type", () => {
    expect(isPreviewableContentType(null)).toBe(false);
    expect(isPreviewableContentType("text/plain")).toBe(false);
  });
});
