export class AssetValidationError extends Error {}

export type AssetInput = {
  name: string;
  description: string | null;
  structureNodeId: string | null;
  aasEndpointUrl: string | null;
  aasGlobalAssetId: string | null;
};

const MAX_NAME_LENGTH = 200;

function parseOptionalTrimmedString(
  formData: FormData,
  fieldName: string
): string | null {
  const raw = formData.get(fieldName);
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed === "" ? null : trimmed;
}

export function parseAssetInput(formData: FormData): AssetInput {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    throw new AssetValidationError("Name is required.");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new AssetValidationError(
      `Name must be at most ${MAX_NAME_LENGTH} characters.`
    );
  }

  const description = parseOptionalTrimmedString(formData, "description");

  const rawStructureNodeId = formData.get("structureNodeId");
  const structureNodeId =
    typeof rawStructureNodeId === "string" && rawStructureNodeId !== ""
      ? rawStructureNodeId
      : null;

  const aasEndpointUrl = parseOptionalTrimmedString(formData, "aasEndpointUrl");
  const aasGlobalAssetId = parseOptionalTrimmedString(
    formData,
    "aasGlobalAssetId"
  );

  return {
    name,
    description,
    structureNodeId,
    aasEndpointUrl,
    aasGlobalAssetId,
  };
}
