/**
 * Flattens an already-fetched AAS shell's submodels into one lowercase,
 * space-joined search string, cached on `Asset.aasSearchText` so the asset
 * search fields (`lib/asset-search.ts`) can match against AAS content
 * without re-fetching it live on every keystroke - see `lib/aas-reindex.ts`
 * for where this gets called and cached.
 */

import type { AasData, AasElementGroup } from "@/lib/aas";

function flattenGroupText(group: AasElementGroup): string {
  const parts: string[] = [group.idShort];
  if (group.displayName) {
    parts.push(group.displayName);
  }
  for (const property of group.properties) {
    parts.push(property.idShort);
    if (property.value) {
      parts.push(property.value);
    }
  }
  for (const file of group.files) {
    parts.push(file.idShort);
    if (file.contentType) {
      parts.push(file.contentType);
    }
  }
  for (const child of group.groups) {
    parts.push(flattenGroupText(child));
  }
  return parts.join(" ");
}

export function buildAasSearchText(aasData: AasData): string {
  const parts: string[] = [aasData.idShort];
  for (const submodel of aasData.submodels) {
    if (submodel.description) {
      parts.push(submodel.description);
    }
    if (submodel.templateName) {
      parts.push(submodel.templateName);
    }
    parts.push(flattenGroupText(submodel));
  }
  return parts.join(" ").toLowerCase();
}
