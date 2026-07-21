/**
 * Read-only client for fetching an Asset Administration Shell (AAS) and its
 * Submodels, given either a direct endpoint URL or a globalAssetId to look
 * up against every AAS Repository configured in Settings > AAS Repositories
 * (the `AasRepository` table) - different manufacturers each run their own
 * repository, so a globalAssetId lookup tries each one in turn until one of
 * them has a matching shell.
 *
 * Submodel elements are collected into a tree of `AasElementGroup`s mirroring
 * the AAS's own `SubmodelElementCollection` nesting, so the display side can
 * render grouped sections the way the official Eclipse BaSyx AAS Web UI
 * does. This intentionally supports only `Property`, `MultiLanguageProperty`
 * (folded into the same `properties` list - both are just a name/value pair
 * once resolved to a display string), and `File` elements - not yet
 * `SubmodelElementList`, `ReferenceElement`, or other types. Those can be
 * added once the display side needs them.
 */

import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT_MS = 5000;

// Guards against unbounded recursion on pathological/malicious data from a
// third-party manufacturer repository we don't control.
const MAX_COLLECTION_DEPTH = 10;

// Matches the version/revision segment of a semanticId URL, e.g.
// ".../1/0/Nameplate" -> version "1", revision "0". Mirrors the same
// heuristic the official BaSyx AAS Web UI uses (SemanticIdUtils.ts) to show
// a version badge for submodels that don't set `administration` themselves.
const VERSION_REVISION_REGEX = /\/(\d+)\/(\d+)(\/|$)/;

// A small, deliberately non-exhaustive list of well-known IDTA/ZVEI Submodel
// Templates, used only as a friendlier fallback name/version when a
// submodel doesn't set its own `displayName`/`administration` - mirrors
// (and is sourced from) the official BaSyx AAS Web UI's own such list
// (SubmodelTemplateUtils.ts). Unknown semanticIds simply skip this step.
const KNOWN_SUBMODEL_TEMPLATES: {
  name: string;
  semanticId: string;
  version: string;
}[] = [
  {
    name: "Digital Nameplate for industrial equipment",
    semanticId: "https://admin-shell.io/zvei/nameplate/2/0/Nameplate",
    version: "2.0",
  },
  {
    name: "Digital Nameplate for industrial equipment",
    semanticId: "https://admin-shell.io/idta/nameplate/3/0/Nameplate",
    version: "3.0",
  },
  {
    name: "Carbon Footprint",
    semanticId: "https://admin-shell.io/idta/CarbonFootprint/CarbonFootprint/0/9",
    version: "0.9",
  },
  {
    name: "Contact Informations",
    semanticId: "https://admin-shell.io/zvei/nameplate/1/0/ContactInformations",
    version: "1.0",
  },
  {
    name: "Handover Documentation",
    semanticId: "0173-1#01-AHF578#001",
    version: "1.2",
  },
  {
    name: "Hierarchical Structures enabling Bills of Material",
    semanticId: "https://admin-shell.io/idta/HierarchicalStructures/1/0/Submodel",
    version: "1.0",
  },
  {
    name: "Hierarchical Structures enabling Bills of Material",
    semanticId: "https://admin-shell.io/idta/HierarchicalStructures/1/1/Submodel",
    version: "1.1",
  },
  {
    name: "Generic Frame for Technical Data for Industrial Equipment in Manufacturing",
    semanticId: "https://admin-shell.io/ZVEI/TechnicalData/Submodel/1/2",
    version: "1.2",
  },
  {
    name: "Time Series Data",
    semanticId: "https://admin-shell.io/idta/TimeSeries/1/1",
    version: "1.1",
  },
];

export type AasReference = {
  aasEndpointUrl?: string | null;
  aasGlobalAssetId?: string | null;
};

export type AasSubmodelProperty = {
  idShort: string;
  value: string | null;
};

export type AasSubmodelFile = {
  idShort: string;
  value: string | null;
  contentType: string | null;
};

export type AasElementGroup = {
  idShort: string;
  displayName: string | null;
  properties: AasSubmodelProperty[];
  files: AasSubmodelFile[];
  groups: AasElementGroup[];
};

export type AasSubmodelData = AasElementGroup & {
  id: string;
  description: string | null;
  templateName: string | null;
  version: string | null;
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

  // The pasted value might actually be a shell's own `id` rather than its
  // globalAssetId - the two are easy to mix up, since both are plain URLs
  // and a shell's `id` often appears right next to `globalAssetId` in a
  // repository's raw JSON. Only tried once the search above has come up
  // empty everywhere, so the common (correct) case isn't slowed down by it.
  const encodedId = encodeAasId(globalAssetId);
  const idPages = await Promise.all(
    repositories.map((repository) => fetchJson(`${repository.baseUrl}/shells/${encodedId}`))
  );

  for (let i = 0; i < repositories.length; i++) {
    if (idPages[i]) {
      return { shell: idPages[i] as Record<string, unknown>, baseUrl: repositories[i].baseUrl };
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

/** First English `langStringSet.text`, else the first available language's. */
function preferredLangText(entries: unknown[]): string | null {
  const candidates = entries.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === "object"
  );
  const preferred =
    candidates.find((entry) => asString(entry.language) === "en") ??
    candidates[0];
  return preferred ? asString(preferred.text) : null;
}

function displayNameOf(node: Record<string, unknown>): string | null {
  return preferredLangText(asArray(node.displayName));
}

function descriptionOf(node: Record<string, unknown>): string | null {
  return preferredLangText(asArray(node.description));
}

function semanticIdOf(node: Record<string, unknown>): string | null {
  const semanticId = node.semanticId;
  if (!semanticId || typeof semanticId !== "object") {
    return null;
  }
  const keys = asArray((semanticId as { keys?: unknown }).keys);
  const firstKey = keys[0];
  if (!firstKey || typeof firstKey !== "object") {
    return null;
  }
  return asString((firstKey as { value?: unknown }).value);
}

function knownTemplateFor(
  semanticId: string | null
): { name: string; version: string } | null {
  if (!semanticId) return null;
  return (
    KNOWN_SUBMODEL_TEMPLATES.find(
      (template) => template.semanticId === semanticId
    ) ?? null
  );
}

function versionFromSemanticId(semanticId: string | null): string | null {
  if (!semanticId) return null;
  const match = semanticId.match(VERSION_REVISION_REGEX);
  // Both capture groups are mandatory in the regex, so a successful match
  // always has both.
  return match ? `${match[1]}.${match[2]}` : null;
}

function administrationVersionOf(node: Record<string, unknown>): string | null {
  const administration = node.administration;
  if (!administration || typeof administration !== "object") {
    return null;
  }
  const version = asString((administration as { version?: unknown }).version);
  if (!version) return null;
  const revision = asString((administration as { revision?: unknown }).revision);
  return revision ? `${version}.${revision}` : version;
}

function multiLanguagePropertyValue(element: Record<string, unknown>): string | null {
  return preferredLangText(asArray(element.value));
}

function buildElementGroup(
  idShort: string,
  displayName: string | null,
  elements: unknown[],
  depth: number
): AasElementGroup {
  if (depth > MAX_COLLECTION_DEPTH) {
    return { idShort, displayName, properties: [], files: [], groups: [] };
  }

  const properties: AasSubmodelProperty[] = [];
  const files: AasSubmodelFile[] = [];
  const groups: AasElementGroup[] = [];

  for (const element of elements) {
    if (!element || typeof element !== "object") {
      continue;
    }
    const el = element as Record<string, unknown>;
    const modelType = el.modelType;
    const elIdShort = asString(el.idShort) ?? "";

    if (modelType === "Property") {
      properties.push({ idShort: elIdShort, value: asString(el.value) });
    } else if (modelType === "MultiLanguageProperty") {
      properties.push({
        idShort: elIdShort,
        value: multiLanguagePropertyValue(el),
      });
    } else if (modelType === "File") {
      files.push({
        idShort: elIdShort,
        value: asString(el.value),
        contentType: asString(el.contentType),
      });
    } else if (modelType === "SubmodelElementCollection") {
      groups.push(
        buildElementGroup(
          elIdShort,
          displayNameOf(el),
          asArray(el.value),
          depth + 1
        )
      );
    }
  }

  return { idShort, displayName, properties, files, groups };
}

function toSubmodelData(submodel: Record<string, unknown>): AasSubmodelData {
  const semanticId = semanticIdOf(submodel);
  const knownTemplate = knownTemplateFor(semanticId);
  const group = buildElementGroup(
    asString(submodel.idShort) ?? "",
    displayNameOf(submodel),
    asArray(submodel.submodelElements),
    0
  );

  return {
    ...group,
    id: asString(submodel.id) ?? "",
    description: descriptionOf(submodel),
    templateName: knownTemplate?.name ?? null,
    version:
      administrationVersionOf(submodel) ??
      knownTemplate?.version ??
      versionFromSemanticId(semanticId),
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
