/**
 * Read-only client for fetching an Asset Administration Shell (AAS) and its
 * Submodels, given either a direct endpoint URL or a globalAssetId to look
 * up against every AAS Repository configured in Settings > AAS Repositories
 * (the `AasRepository` table) - different manufacturers each run their own
 * repository, so a globalAssetId lookup tries each one in turn until one of
 * them has a matching shell.
 *
 * This intentionally supports only simple `Property` elements - including
 * ones nested inside `SubmodelElementCollection`s, which real-world
 * manufacturer submodels (e.g. WAGO's TechnicalData) nest their properties
 * in almost exclusively - not yet other element types like
 * `MultiLanguageProperty` or `File`. Those can be added once the display
 * side needs them.
 */

import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT_MS = 5000;

// Guards against unbounded recursion on pathological/malicious data from a
// third-party manufacturer repository we don't control.
const MAX_COLLECTION_DEPTH = 10;

export type AasReference = {
  aasEndpointUrl?: string | null;
  aasGlobalAssetId?: string | null;
};

export type AasSubmodelProperty = {
  idShort: string;
  value: string | null;
};

export type AasSubmodelData = {
  id: string;
  idShort: string;
  properties: AasSubmodelProperty[];
};

export type AasData = {
  id: string;
  idShort: string;
  submodels: AasSubmodelData[];
};

function encodeAasId(id: string): string {
  return Buffer.from(id, "utf-8").toString("base64url");
}

function deriveBaseUrl(shellEndpointUrl: string): string {
  const marker = "/shells/";
  const index = shellEndpointUrl.indexOf(marker);
  return index === -1 ? shellEndpointUrl : shellEndpointUrl.slice(0, index);
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function resolveShellByGlobalAssetId(
  globalAssetId: string
): Promise<{ shell: Record<string, unknown>; baseUrl: string } | null> {
  const repositories = await prisma.aasRepository.findMany();
  const filter = Buffer.from(
    JSON.stringify({ name: "globalAssetId", value: globalAssetId })
  ).toString("base64url");

  // Queried in parallel, each bounded by its own fetch timeout, so one slow
  // or unresponsive repository doesn't add its full timeout on top of every
  // other configured repository's.
  const pages = await Promise.all(
    repositories.map((repository) =>
      fetchJson(`${repository.baseUrl}/shells?assetIds=${filter}`)
    )
  );

  for (let i = 0; i < repositories.length; i++) {
    const shell = asArray(pages[i]?.result)[0];
    if (shell && typeof shell === "object") {
      return { shell: shell as Record<string, unknown>, baseUrl: repositories[i].baseUrl };
    }
  }

  return null;
}

async function resolveShell(
  reference: AasReference
): Promise<{ shell: Record<string, unknown>; baseUrl: string } | null> {
  if (reference.aasEndpointUrl) {
    const shell = await fetchJson(reference.aasEndpointUrl);
    if (!shell) {
      return null;
    }
    return { shell, baseUrl: deriveBaseUrl(reference.aasEndpointUrl) };
  }

  if (reference.aasGlobalAssetId) {
    return resolveShellByGlobalAssetId(reference.aasGlobalAssetId);
  }

  return null;
}

function extractSubmodelId(reference: unknown): string | null {
  if (!reference || typeof reference !== "object") {
    return null;
  }
  const keys = asArray((reference as { keys?: unknown }).keys);
  const lastKey = keys[keys.length - 1];
  if (!lastKey || typeof lastKey !== "object") {
    return null;
  }
  return asString((lastKey as { value?: unknown }).value);
}

function collectProperties(
  elements: unknown[],
  pathPrefix: string,
  depth: number
): AasSubmodelProperty[] {
  if (depth > MAX_COLLECTION_DEPTH) {
    return [];
  }

  const properties: AasSubmodelProperty[] = [];
  for (const element of elements) {
    if (!element || typeof element !== "object") {
      continue;
    }
    const modelType = (element as { modelType?: unknown }).modelType;
    const idShort = asString((element as { idShort?: unknown }).idShort) ?? "";
    const qualifiedIdShort = pathPrefix ? `${pathPrefix} / ${idShort}` : idShort;

    if (modelType === "Property") {
      properties.push({
        idShort: qualifiedIdShort,
        value: asString((element as { value?: unknown }).value),
      });
    } else if (modelType === "SubmodelElementCollection") {
      properties.push(
        ...collectProperties(
          asArray((element as { value?: unknown }).value),
          qualifiedIdShort,
          depth + 1
        )
      );
    }
  }
  return properties;
}

function toSubmodelData(submodel: Record<string, unknown>): AasSubmodelData {
  return {
    id: asString(submodel.id) ?? "",
    idShort: asString(submodel.idShort) ?? "",
    properties: collectProperties(asArray(submodel.submodelElements), "", 0),
  };
}

async function fetchSubmodels(
  baseUrl: string,
  aasId: string
): Promise<AasSubmodelData[]> {
  const refsPage = await fetchJson(
    `${baseUrl}/shells/${encodeAasId(aasId)}/submodel-refs`
  );
  const submodelIds = asArray(refsPage?.result)
    .map(extractSubmodelId)
    .filter((id): id is string => id !== null);

  const submodels = await Promise.all(
    submodelIds.map((id) => fetchJson(`${baseUrl}/submodels/${encodeAasId(id)}`))
  );

  return submodels
    .filter((submodel): submodel is Record<string, unknown> => submodel !== null)
    .map(toSubmodelData);
}

export async function getAasData(reference: AasReference): Promise<AasData | null> {
  const resolved = await resolveShell(reference);
  if (!resolved) {
    return null;
  }

  const aasId = asString(resolved.shell.id);
  if (!aasId) {
    return null;
  }

  return {
    id: aasId,
    idShort: asString(resolved.shell.idShort) ?? "",
    submodels: await fetchSubmodels(resolved.baseUrl, aasId),
  };
}
