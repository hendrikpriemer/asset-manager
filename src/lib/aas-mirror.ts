/**
 * Mirrors an already-fetched AAS shell (+ its submodels) into our own local
 * AAS repository (the platform's fixed local mirror - see
 * `ensureLocalMirrorRepository` in `lib/aas-repositories.ts`, normally the
 * `basyx-aas-env` this project already runs). This is
 * additive, not a replacement for the original source: it makes the shell's
 * data available even if the source repository is slow, rate-limited, or
 * temporarily down, and gives any future feature that wants to work with
 * AAS content (e.g. a chatbot answering questions from a linked manual) one
 * consistent local place to read from instead of juggling several external
 * repositories with different auth requirements.
 *
 * Write behavior verified live against the real local `basyx-aas-env`
 * (not just inferred from its OpenAPI spec): `PUT /{collection}/{id}`
 * updates an existing resource (404 if it doesn't exist yet, in which case
 * we fall back to `POST /{collection}` to create it; a `POST` on an
 * already-existing id 409s). Writing the shell also auto-registers its
 * submodel references from the shell body's own `submodels` array - no
 * separate call to `/shells/{id}/submodel-refs` is needed.
 */

import { encodeAasId } from "@/lib/aas";
import { ensureLocalMirrorRepository } from "@/lib/aas-repositories";

const MIRROR_TIMEOUT_MS = 5000;

async function upsertResource(
  baseUrl: string,
  collection: "shells" | "submodels",
  id: string,
  body: Record<string, unknown>
): Promise<boolean> {
  try {
    const putResponse = await fetch(`${baseUrl}/${collection}/${encodeAasId(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MIRROR_TIMEOUT_MS),
    });
    if (putResponse.ok) {
      return true;
    }
    if (putResponse.status !== 404) {
      return false;
    }
    const postResponse = await fetch(`${baseUrl}/${collection}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(MIRROR_TIMEOUT_MS),
    });
    return postResponse.ok;
  } catch {
    return false;
  }
}

export type MirrorStatus = "mirrored" | "mirror-failed";

export async function mirrorAasDataToLocalRepo(raw: {
  shell: Record<string, unknown>;
  submodels: Record<string, unknown>[];
}): Promise<MirrorStatus> {
  const localRepo = await ensureLocalMirrorRepository();

  const shellId = typeof raw.shell.id === "string" ? raw.shell.id : null;
  if (!shellId) {
    return "mirror-failed";
  }

  const shellOk = await upsertResource(localRepo.baseUrl, "shells", shellId, raw.shell);
  if (!shellOk) {
    return "mirror-failed";
  }

  // Independent writes, so run them in parallel rather than one at a time.
  const submodelResults = await Promise.all(
    raw.submodels.map((submodel) => {
      const submodelId = typeof submodel.id === "string" ? submodel.id : null;
      return submodelId
        ? upsertResource(localRepo.baseUrl, "submodels", submodelId, submodel)
        : Promise.resolve(false);
    })
  );

  return submodelResults.every(Boolean) ? "mirrored" : "mirror-failed";
}
