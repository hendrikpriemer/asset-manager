/**
 * Read-only client for fetching an Asset Administration Shell (AAS) and its
 * Submodels, given either a direct endpoint URL or a globalAssetId to look
 * up against the configured default AAS Repository (AAS_REPOSITORY_URL).
 *
 * This intentionally supports only simple `Property` submodel elements for
 * now - enough to prototype the read path end-to-end (e.g. a Digital
 * Nameplate submodel). Collections, files, and other element types can be
 * added once the display side needs them.
 */

const FETCH_TIMEOUT_MS = 5000;

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

function repositoryBaseUrl(): string | null {
  return process.env.AAS_REPOSITORY_URL ?? null;
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
    const baseUrl = repositoryBaseUrl();
    if (!baseUrl) {
      return null;
    }
    const filter = Buffer.from(
      JSON.stringify({ name: "globalAssetId", value: reference.aasGlobalAssetId })
    ).toString("base64url");
    const page = await fetchJson(`${baseUrl}/shells?assetIds=${filter}`);
    const shell = asArray(page?.result)[0];
    if (!shell || typeof shell !== "object") {
      return null;
    }
    return { shell: shell as Record<string, unknown>, baseUrl };
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

function toSubmodelData(submodel: Record<string, unknown>): AasSubmodelData {
  const properties = asArray(submodel.submodelElements)
    .filter(
      (element): element is Record<string, unknown> =>
        !!element &&
        typeof element === "object" &&
        (element as { modelType?: unknown }).modelType === "Property"
    )
    .map((element) => ({
      idShort: asString(element.idShort) ?? "",
      value: asString(element.value),
    }));

  return {
    id: asString(submodel.id) ?? "",
    idShort: asString(submodel.idShort) ?? "",
    properties,
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
