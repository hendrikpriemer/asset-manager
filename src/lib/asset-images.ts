export class AssetImageValidationError extends Error {}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type ParsedAssetImage = { data: Uint8Array<ArrayBuffer>; type: string };

export async function parseAssetImage(
  formData: FormData,
  fieldName: string,
  label: string
): Promise<ParsedAssetImage | null> {
  const value = formData.get(fieldName);
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    throw new AssetImageValidationError(
      `${label} must be a JPEG, PNG, or WEBP image.`
    );
  }
  if (value.size > MAX_IMAGE_BYTES) {
    throw new AssetImageValidationError(`${label} must be smaller than 8 MB.`);
  }

  return {
    data: new Uint8Array(await value.arrayBuffer()),
    type: value.type,
  };
}
