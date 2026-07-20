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

/**
 * A single "AAS reference" input is either a direct endpoint URL or a
 * globalAssetId to look up in the configured AAS repository. The AAS REST
 * API always exposes a shell at a `/shells/{id}` path, while a
 * globalAssetId is just an identifier the asset owner assigned - so the
 * presence of a `/shells/` segment reliably tells the two apart.
 */
export function classifyAasReference(rawValue: string): {
  aasEndpointUrl: string | null;
  aasGlobalAssetId: string | null;
} {
  const value = rawValue.trim();
  if (value === "") {
    return { aasEndpointUrl: null, aasGlobalAssetId: null };
  }
  if (value.includes("/shells/")) {
    return { aasEndpointUrl: value, aasGlobalAssetId: null };
  }
  return { aasEndpointUrl: null, aasGlobalAssetId: value };
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

  const rawAasReference = formData.get("aasReference");
  const { aasEndpointUrl, aasGlobalAssetId } = classifyAasReference(
    typeof rawAasReference === "string" ? rawAasReference : ""
  );

  return {
    name,
    description,
    structureNodeId,
    aasEndpointUrl,
    aasGlobalAssetId,
  };
}
