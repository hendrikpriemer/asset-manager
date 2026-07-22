import { getAssetById } from "@/lib/assets";
import { getAasData, type AasElementGroup } from "@/lib/aas";
import { assertPubliclyRoutableUrl } from "@/lib/url-safety";

/**
 * Streams a `File` element's contents from a linked AAS, previewed inline
 * in the app (PDF iframe, 3D model viewer). Never trusts a URL supplied by
 * the client: the file reference is re-resolved server-side from the
 * asset's own, freshly-fetched AAS data (`submodelId` + `groupPath` +
 * `fileIdShort` locate the exact element in that tree), and the resolved
 * URL is checked against private/internal address ranges before it's ever
 * fetched - see `lib/url-safety.ts` for why.
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONTENT_LENGTH = 50 * 1024 * 1024;

function findGroupByPath(
  root: AasElementGroup,
  groupPath: string[]
): AasElementGroup | null {
  let current = root;
  for (const idShort of groupPath) {
    const next = current.groups.find((group) => group.idShort === idShort);
    if (!next) {
      return null;
    }
    current = next;
  }
  return current;
}

function parseGroupPath(raw: string | null): string[] | null {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const submodelId = searchParams.get("submodelId");
  const fileIdShort = searchParams.get("fileIdShort");
  const groupPath = parseGroupPath(searchParams.get("groupPath"));

  if (!submodelId || !fileIdShort || groupPath === null) {
    return new Response(null, { status: 400 });
  }

  const asset = await getAssetById(id);
  if (!asset || (!asset.aasEndpointUrl && !asset.aasGlobalAssetId)) {
    return new Response(null, { status: 404 });
  }

  const aasData = await getAasData(asset);
  if (!aasData) {
    return new Response(null, { status: 404 });
  }

  const submodel = aasData.submodels.find((candidate) => candidate.id === submodelId);
  const group = submodel && findGroupByPath(submodel, groupPath);
  const file = group?.files.find((candidate) => candidate.idShort === fileIdShort);
  if (!file || !file.value) {
    return new Response(null, { status: 404 });
  }

  try {
    await assertPubliclyRoutableUrl(file.value);
  } catch {
    return new Response(null, { status: 502 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(file.value, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    return new Response(null, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: 502 });
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH) {
    return new Response(null, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        file.contentType ?? upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
    },
  });
}
