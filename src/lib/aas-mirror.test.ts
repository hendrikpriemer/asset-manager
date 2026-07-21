import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ensureLocalMirrorRepository } = vi.hoisted(() => ({
  ensureLocalMirrorRepository: vi.fn(),
}));

vi.mock("@/lib/aas-repositories", () => ({ ensureLocalMirrorRepository }));

const { mirrorAasDataToLocalRepo } = await import("./aas-mirror");

const LOCAL_BASE = "http://basyx-aas-env:8081";
const localRepo = { id: "repo-1", name: "Local", baseUrl: LOCAL_BASE, isLocalMirror: true };

const shell = { modelType: "AssetAdministrationShell", id: "https://example.com/aas/1" };
const submodel = { modelType: "Submodel", id: "https://example.com/sm/1" };

function jsonEncode(id: string): string {
  return Buffer.from(id, "utf-8").toString("base64url");
}

function response(ok: boolean, status: number): Response {
  return { ok, status } as Response;
}

beforeEach(() => {
  ensureLocalMirrorRepository.mockReset();
  ensureLocalMirrorRepository.mockResolvedValue(localRepo);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mirrorAasDataToLocalRepo", () => {
  it("returns mirror-failed when the shell has no id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell: {}, submodels: [] });

    expect(result).toBe("mirror-failed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PUTs the shell and each submodel when they already exist, and mirrors successfully", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      if (url === `${LOCAL_BASE}/shells/${jsonEncode(shell.id)}`) {
        return response(true, 204);
      }
      if (url === `${LOCAL_BASE}/submodels/${jsonEncode(submodel.id)}`) {
        return response(true, 204);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [submodel] });

    expect(result).toBe("mirrored");
    expect(ensureLocalMirrorRepository).toHaveBeenCalledTimes(1);
  });

  it("falls back to POST when PUT reports the resource doesn't exist yet (404)", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `${LOCAL_BASE}/shells/${jsonEncode(shell.id)}` && init?.method === "PUT") {
        return response(false, 404);
      }
      if (url === `${LOCAL_BASE}/shells` && init?.method === "POST") {
        return response(true, 201);
      }
      if (url === `${LOCAL_BASE}/submodels/${jsonEncode(submodel.id)}` && init?.method === "PUT") {
        return response(false, 404);
      }
      if (url === `${LOCAL_BASE}/submodels` && init?.method === "POST") {
        return response(true, 201);
      }
      throw new Error(`unexpected call: ${init?.method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [submodel] });

    expect(result).toBe("mirrored");
  });

  it("returns mirror-failed when the shell PUT fails with a non-404 status, without attempting submodels", async () => {
    const fetchMock = vi.fn(async () => response(false, 500));
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [submodel] });

    expect(result).toBe("mirror-failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns mirror-failed when the POST fallback for the shell also fails", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PUT") return response(false, 404);
      if (init?.method === "POST") return response(false, 409);
      throw new Error("unexpected call");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [] });

    expect(result).toBe("mirror-failed");
  });

  it("returns mirror-failed when a submodel has no id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(true, 204)));

    const result = await mirrorAasDataToLocalRepo({
      shell,
      submodels: [{ modelType: "Submodel" }],
    });

    expect(result).toBe("mirror-failed");
  });

  it("returns mirror-failed when a submodel write fails", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === `${LOCAL_BASE}/shells/${jsonEncode(shell.id)}` && init?.method === "PUT") {
        return response(true, 204);
      }
      return response(false, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [submodel] });

    expect(result).toBe("mirror-failed");
  });

  it("returns mirror-failed when a write throws (network error or timeout)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const result = await mirrorAasDataToLocalRepo({ shell, submodels: [] });

    expect(result).toBe("mirror-failed");
  });
});
