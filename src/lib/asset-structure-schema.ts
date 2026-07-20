import type { AssetStructureLevel } from "@/generated/prisma/client";

export class AssetStructureValidationError extends Error {}

export type StructureNodeInput = {
  name: string;
  description: string | null;
  address: string | null;
  timezone: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
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

export function parseStructureNodeInput(formData: FormData): StructureNodeInput {
  const rawName = formData.get("name");
  const name = typeof rawName === "string" ? rawName.trim() : "";

  if (!name) {
    throw new AssetStructureValidationError("Name is required.");
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new AssetStructureValidationError(
      `Name must be at most ${MAX_NAME_LENGTH} characters.`
    );
  }

  return {
    name,
    description: parseOptionalTrimmedString(formData, "description"),
    address: parseOptionalTrimmedString(formData, "address"),
    timezone: parseOptionalTrimmedString(formData, "timezone"),
    manufacturer: parseOptionalTrimmedString(formData, "manufacturer"),
    serialNumber: parseOptionalTrimmedString(formData, "serialNumber"),
  };
}

/** Levels a user can add as a child node. Enterprise is only ever the root. */
export const ADDABLE_LEVELS: AssetStructureLevel[] = [
  "SITE",
  "AREA",
  "WORK_CENTER",
  "EQUIPMENT",
];

export const LEVEL_LABELS: Record<AssetStructureLevel, string> = {
  ENTERPRISE: "Enterprise",
  SITE: "Site",
  AREA: "Area",
  WORK_CENTER: "Work Center",
  EQUIPMENT: "Equipment",
};

export function parseAddableLevel(
  value: FormDataEntryValue | null
): AssetStructureLevel {
  if (
    typeof value === "string" &&
    (ADDABLE_LEVELS as string[]).includes(value)
  ) {
    return value as AssetStructureLevel;
  }
  throw new AssetStructureValidationError("Invalid level.");
}
