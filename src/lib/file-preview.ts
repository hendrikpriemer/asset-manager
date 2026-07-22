/**
 * Recognizes which `File` element content types this app can preview
 * in-app (PDF inline, a 3D model viewer, or an inline image thumbnail)
 * instead of only offering a download link. The 3D content types mirror
 * the ones the official Eclipse BaSyx AAS Web UI's `CADPreview.vue`
 * recognizes (STL/OBJ/glTF via three.js's own loaders) - STEP is
 * additionally supported here via `occt-import-js`, which BaSyx's own
 * reference UI does not handle at all.
 */

export type Model3DFormat = "step" | "stl" | "obj" | "gltf";

const STL_CONTENT_TYPES = new Set([
  "application/sla",
  "application/vnd.ms-pki.stl",
  "application/stl",
  "model/stl",
  "text/stl",
  "text/x-stl",
  "text/x-sla",
]);
const OBJ_CONTENT_TYPES = new Set(["application/obj"]);
const GLTF_CONTENT_TYPES = new Set(["model/gltf+json", "model/gltf-binary"]);

export function detectModel3DFormat(contentType: string | null): Model3DFormat | null {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.toLowerCase();
  if (normalized === "application/step") return "step";
  if (STL_CONTENT_TYPES.has(normalized)) return "stl";
  if (OBJ_CONTENT_TYPES.has(normalized)) return "obj";
  if (GLTF_CONTENT_TYPES.has(normalized)) return "gltf";
  return null;
}

export function isPdfContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase() === "application/pdf";
}

export function isImageContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().startsWith("image/") ?? false;
}

export function isPreviewableContentType(contentType: string | null): boolean {
  return isPdfContentType(contentType) || detectModel3DFormat(contentType) !== null;
}
