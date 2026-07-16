export class AssetValidationError extends Error {}

export type AssetInput = {
  name: string;
  description: string | null;
  structureNodeId: string | null;
};

const MAX_NAME_LENGTH = 200;

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

  const rawDescription = formData.get("description");
  const trimmedDescription =
    typeof rawDescription === "string" ? rawDescription.trim() : "";
  const description = trimmedDescription === "" ? null : trimmedDescription;

  const rawStructureNodeId = formData.get("structureNodeId");
  const structureNodeId =
    typeof rawStructureNodeId === "string" && rawStructureNodeId !== ""
      ? rawStructureNodeId
      : null;

  return { name, description, structureNodeId };
}
