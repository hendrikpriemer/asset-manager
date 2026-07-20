import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { aasRepository: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

const { getAasData } = await import("./aas");

const REPO_BASE = "http://basyx-aas-env:8081";

function encode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

const shell = {
  modelType: "AssetAdministrationShell",
  id: "https://example.com/aas/lathe-1",
  idShort: "Lathe1",
  assetInformation: { assetKind: "Instance", globalAssetId: "https://example.com/assets/lathe-1" },
};

const submodelRefsPage = {
  result: [
    { type: "ModelReference", keys: [{ type: "Submodel", value: "https://example.com/sm/nameplate" }] },
  ],
};

const nameplateSubmodel = {
  modelType: "Submodel",
  id: "https://example.com/sm/nameplate",
  idShort: "Nameplate",
  submodelElements: [
    { modelType: "Property", idShort: "ManufacturerName", value: "Acme Machine Works" },
    { modelType: "Property", idShort: "YearOfConstruction", value: "2019" },
    { modelType: "Collection", idShort: "Markings" },
  ],
};

beforeEach(() => {
  prisma.aasRepository.findMany.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAasData", () => {
  it("returns null when neither aasEndpointUrl nor aasGlobalAssetId is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({});

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches a shell by direct endpoint URL and resolves its submodels", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://external-vendor.example/shells/abc") {
        return jsonResponse(shell);
      }
      if (url === `http://external-vendor.example/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse(submodelRefsPage);
      }
      if (url === `http://external-vendor.example/submodels/${encode(nameplateSubmodel.id)}`) {
        return jsonResponse(nameplateSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({
      aasEndpointUrl: "http://external-vendor.example/shells/abc",
    });

    expect(result).toEqual({
      id: shell.id,
      idShort: "Lathe1",
      submodels: [
        {
          id: nameplateSubmodel.id,
          idShort: "Nameplate",
          properties: [
            { idShort: "ManufacturerName", value: "Acme Machine Works" },
            { idShort: "YearOfConstruction", value: "2019" },
          ],
        },
      ],
    });
  });

  it("returns null when the direct endpoint responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result).toBeNull();
  });

  it("returns null when the fetch call throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result).toBeNull();
  });

  it("returns null for a globalAssetId lookup when no repository is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: "https://example.com/assets/lathe-1" });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up a shell by globalAssetId against the configured repository", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "repo-1", name: "Local BaSyx", baseUrl: REPO_BASE },
    ]);
    const expectedFilter = Buffer.from(
      JSON.stringify({ name: "globalAssetId", value: "https://example.com/assets/lathe-1" })
    ).toString("base64url");

    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${REPO_BASE}/shells?assetIds=${expectedFilter}`) {
        return jsonResponse({ result: [shell] });
      }
      if (url === `${REPO_BASE}/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse(submodelRefsPage);
      }
      if (url === `${REPO_BASE}/submodels/${encode(nameplateSubmodel.id)}`) {
        return jsonResponse(nameplateSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: "https://example.com/assets/lathe-1" });

    expect(result?.id).toBe(shell.id);
    expect(result?.submodels).toHaveLength(1);
  });

  it("returns null when the globalAssetId lookup finds no shell in any configured repository", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "repo-1", name: "Local BaSyx", baseUrl: REPO_BASE },
    ]);
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ result: [] })));

    const result = await getAasData({ aasGlobalAssetId: "https://example.com/assets/none" });

    expect(result).toBeNull();
  });

  it("tries each configured repository in turn until one has a matching shell", async () => {
    const otherRepoBase = "https://c1.api.wago.com/smartdata-aas-env";
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "repo-1", name: "Local BaSyx", baseUrl: REPO_BASE },
      { id: "repo-2", name: "WAGO", baseUrl: otherRepoBase },
    ]);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith(REPO_BASE) && url.includes("assetIds")) {
        return jsonResponse({ result: [] });
      }
      if (url.startsWith(otherRepoBase) && url.includes("assetIds")) {
        return jsonResponse({ result: [shell] });
      }
      if (url === `${otherRepoBase}/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse({ result: [] });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: "https://example.com/assets/lathe-1" });

    expect(result?.id).toBe(shell.id);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(REPO_BASE),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(otherRepoBase),
      expect.anything()
    );
  });

  it("prefers aasEndpointUrl over aasGlobalAssetId when both are set", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") {
        return jsonResponse(shell);
      }
      if (url.includes("/submodel-refs")) {
        return jsonResponse({ result: [] });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await getAasData({
      aasEndpointUrl: "http://vendor.example/shells/abc",
      aasGlobalAssetId: "https://example.com/assets/lathe-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://vendor.example/shells/abc",
      expect.anything()
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("assetIds"),
      expect.anything()
    );
  });

  it("returns null when the resolved shell has no id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ idShort: "NoId" })));

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result).toBeNull();
  });

  it("returns an empty submodels list when submodel-refs has no entries", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) return jsonResponse({ result: [] });
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels).toEqual([]);
  });

  it("skips submodel references that are missing, malformed, or unresolvable", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [
            "not-an-object",
            { keys: [] },
            { keys: [{ value: 42 }] },
            { keys: [{ value: "https://example.com/sm/missing" }] },
            { keys: [{ type: "Submodel", value: nameplateSubmodel.id }] },
          ],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/missing")}`) {
        return jsonResponse(null, false);
      }
      if (url === `http://vendor.example/submodels/${encode(nameplateSubmodel.id)}`) {
        return jsonResponse(nameplateSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels).toHaveLength(1);
    expect(result?.submodels[0].id).toBe(nameplateSubmodel.id);
  });

  it("defaults idShort/value to empty string or null for malformed submodel elements", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/odd" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/odd")}`) {
        return jsonResponse({
          id: "https://example.com/sm/odd",
          submodelElements: [{ modelType: "Property", value: 123 }],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].idShort).toBe("");
    expect(result?.submodels[0].properties).toEqual([{ idShort: "", value: null }]);
  });

  it("treats a non-array submodelElements as no properties", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/odd" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/odd")}`) {
        return jsonResponse({ id: "https://example.com/sm/odd", idShort: "Odd" });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([]);
  });

  it("keeps an endpoint URL without a /shells/ segment unchanged as the base URL", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/custom-shell-path") return jsonResponse(shell);
      if (url === `http://vendor.example/custom-shell-path/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse({ result: [] });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({
      aasEndpointUrl: "http://vendor.example/custom-shell-path",
    });

    expect(result?.id).toBe(shell.id);
  });

  it("defaults the shell idShort to an empty string when missing", async () => {
    const shellWithoutIdShort = { id: shell.id };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shellWithoutIdShort);
      if (url.includes("/submodel-refs")) return jsonResponse({ result: [] });
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.idShort).toBe("");
  });

  it("recurses into SubmodelElementCollections, qualifying nested property idShorts with their collection path", async () => {
    const technicalData = {
      modelType: "Submodel",
      id: "https://example.com/sm/technical-data",
      idShort: "TechnicalData",
      submodelElements: [
        {
          modelType: "SubmodelElementCollection",
          idShort: "GeneralInformation",
          value: [
            { modelType: "Property", idShort: "ManufacturerName", value: "WAGO" },
            {
              modelType: "MultiLanguageProperty",
              idShort: "ManufacturerProductDesignation",
              value: [],
            },
          ],
        },
        { modelType: "Property", idShort: "TopLevelProp", value: "top" },
        null,
        "not-an-object",
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: technicalData.id }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode(technicalData.id)}`) {
        return jsonResponse(technicalData);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([
      { idShort: "GeneralInformation / ManufacturerName", value: "WAGO" },
      { idShort: "TopLevelProp", value: "top" },
    ]);
  });

  it("qualifies a property's idShort with the full path through multiple nested collections", async () => {
    const deepSubmodel = {
      id: "https://example.com/sm/deep",
      submodelElements: [
        {
          modelType: "SubmodelElementCollection",
          idShort: "Outer",
          value: [
            {
              modelType: "SubmodelElementCollection",
              idShort: "Inner",
              value: [{ modelType: "Property", idShort: "Leaf", value: "deep-value" }],
            },
          ],
        },
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: deepSubmodel.id }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode(deepSubmodel.id)}`) {
        return jsonResponse(deepSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([
      { idShort: "Outer / Inner / Leaf", value: "deep-value" },
    ]);
  });

  it("treats a SubmodelElementCollection with a non-array value as having no nested properties", async () => {
    const brokenSubmodel = {
      id: "https://example.com/sm/broken",
      submodelElements: [
        { modelType: "SubmodelElementCollection", idShort: "Broken", value: "not-an-array" },
      ],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: brokenSubmodel.id }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode(brokenSubmodel.id)}`) {
        return jsonResponse(brokenSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([]);
  });

  it("stops recursing into collections nested deeper than the max depth", async () => {
    function nestedCollection(remainingDepth: number): Record<string, unknown> {
      if (remainingDepth === 0) {
        return { modelType: "Property", idShort: "Leaf", value: "too-deep" };
      }
      return {
        modelType: "SubmodelElementCollection",
        idShort: `Level${remainingDepth}`,
        value: [nestedCollection(remainingDepth - 1)],
      };
    }
    // 11 levels of nesting: the leaf Property ends up processed at depth 11,
    // one past MAX_COLLECTION_DEPTH (10), so it must be pruned.
    const tooDeepSubmodel = {
      id: "https://example.com/sm/too-deep",
      submodelElements: [nestedCollection(11)],
    };
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: tooDeepSubmodel.id }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode(tooDeepSubmodel.id)}`) {
        return jsonResponse(tooDeepSubmodel);
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([]);
  });

  it("defaults a submodel's id to an empty string when missing", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/no-id" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/no-id")}`) {
        return jsonResponse({ idShort: "NoId" });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].id).toBe("");
    expect(result?.submodels[0].idShort).toBe("NoId");
  });
});
