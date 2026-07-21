import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { aasRepository: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

const { getAasData, getRawAasData, toAasData, encodeAasId } = await import("./aas");

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

async function fetchOne(
  url: string,
  matchers: Record<string, unknown>
): Promise<Response> {
  for (const [key, body] of Object.entries(matchers)) {
    if (url === key) return jsonResponse(body);
  }
  throw new Error(`unexpected URL: ${url}`);
}

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
          displayName: null,
          description: null,
          templateName: null,
          version: null,
          properties: [
            { idShort: "ManufacturerName", value: "Acme Machine Works" },
            { idShort: "YearOfConstruction", value: "2019" },
          ],
          files: [],
          groups: [],
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
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("assetIds")) {
        return jsonResponse({ result: [] });
      }
      // The shell-id fallback also finds nothing.
      return jsonResponse(null, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: "https://example.com/assets/none" });

    expect(result).toBeNull();
  });

  it("falls back to treating the value as a shell's own id when no repository's globalAssetId matches", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "repo-1", name: "Local BaSyx", baseUrl: REPO_BASE },
    ]);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("assetIds")) {
        return jsonResponse({ result: [] });
      }
      if (url === `${REPO_BASE}/shells/${encode(shell.id)}`) {
        return jsonResponse(shell);
      }
      if (url === `${REPO_BASE}/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse({ result: [] });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: shell.id });

    expect(result?.id).toBe(shell.id);
  });

  it("tries the shell-id fallback across every configured repository until one matches", async () => {
    const otherRepoBase = "https://c1.api.wago.com/smartdata-aas-env";
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "repo-1", name: "Local BaSyx", baseUrl: REPO_BASE },
      { id: "repo-2", name: "WAGO", baseUrl: otherRepoBase },
    ]);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("assetIds")) {
        return jsonResponse({ result: [] });
      }
      if (url === `${REPO_BASE}/shells/${encode(shell.id)}`) {
        return jsonResponse(null, false);
      }
      if (url === `${otherRepoBase}/shells/${encode(shell.id)}`) {
        return jsonResponse(shell);
      }
      if (url === `${otherRepoBase}/shells/${encode(shell.id)}/submodel-refs`) {
        return jsonResponse({ result: [] });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasGlobalAssetId: shell.id });

    expect(result?.id).toBe(shell.id);
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

  it("extracts a top-level File element with its contentType", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/docs" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/docs")}`) {
        return jsonResponse({
          id: "https://example.com/sm/docs",
          idShort: "Documentation",
          submodelElements: [
            {
              modelType: "File",
              idShort: "Datasheet",
              contentType: "application/pdf",
              value: "https://example.com/files/datasheet.pdf",
            },
          ],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].files).toEqual([
      {
        idShort: "Datasheet",
        contentType: "application/pdf",
        value: "https://example.com/files/datasheet.pdf",
      },
    ]);
  });

  it("puts a File element nested inside a SubmodelElementCollection into that group, not the top level", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/mcad" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/mcad")}`) {
        return jsonResponse({
          id: "https://example.com/sm/mcad",
          idShort: "MCAD",
          submodelElements: [
            {
              modelType: "SubmodelElementCollection",
              idShort: "Document00_STEP",
              value: [
                {
                  modelType: "File",
                  idShort: "DigitalFile",
                  contentType: "application/step",
                  value: "https://example.com/files/part.stp",
                },
              ],
            },
          ],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].files).toEqual([]);
    expect(result?.submodels[0].groups).toEqual([
      {
        idShort: "Document00_STEP",
        displayName: null,
        properties: [],
        files: [
          {
            idShort: "DigitalFile",
            contentType: "application/step",
            value: "https://example.com/files/part.stp",
          },
        ],
        groups: [],
      },
    ]);
  });

  it("defaults a File element's value and contentType to null when malformed", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/odd-file" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/odd-file")}`) {
        return jsonResponse({
          id: "https://example.com/sm/odd-file",
          submodelElements: [{ modelType: "File" }],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].files).toEqual([
      { idShort: "", value: null, contentType: null },
    ]);
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

  it("nests properties into a group matching their SubmodelElementCollection, and folds MultiLanguageProperty in as a property", async () => {
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
              value: [
                { language: "de", text: "Servoantrieb" },
                { language: "en", text: "Servo drive" },
              ],
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
      { idShort: "TopLevelProp", value: "top" },
    ]);
    expect(result?.submodels[0].groups).toEqual([
      {
        idShort: "GeneralInformation",
        displayName: null,
        properties: [
          { idShort: "ManufacturerName", value: "WAGO" },
          { idShort: "ManufacturerProductDesignation", value: "Servo drive" },
        ],
        files: [],
        groups: [],
      },
    ]);
  });

  it("falls back to the first available language for a MultiLanguageProperty when English is absent", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/mlp" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/mlp")}`) {
        return jsonResponse({
          id: "https://example.com/sm/mlp",
          submodelElements: [
            {
              modelType: "MultiLanguageProperty",
              idShort: "ProductFamily",
              value: [{ language: "de", text: "CMMT-AS" }],
            },
          ],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([
      { idShort: "ProductFamily", value: "CMMT-AS" },
    ]);
  });

  it("defaults a MultiLanguageProperty's value to null when it has no language entries", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "http://vendor.example/shells/abc") return jsonResponse(shell);
      if (url.includes("/submodel-refs")) {
        return jsonResponse({
          result: [{ keys: [{ type: "Submodel", value: "https://example.com/sm/mlp-empty" }] }],
        });
      }
      if (url === `http://vendor.example/submodels/${encode("https://example.com/sm/mlp-empty")}`) {
        return jsonResponse({
          id: "https://example.com/sm/mlp-empty",
          submodelElements: [
            { modelType: "MultiLanguageProperty", idShort: "Empty", value: [] },
          ],
        });
      }
      throw new Error(`unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result?.submodels[0].properties).toEqual([{ idShort: "Empty", value: null }]);
  });

  it("nests groups to match multiple levels of SubmodelElementCollection", async () => {
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

    expect(result?.submodels[0].groups).toEqual([
      {
        idShort: "Outer",
        displayName: null,
        properties: [],
        files: [],
        groups: [
          {
            idShort: "Inner",
            displayName: null,
            properties: [{ idShort: "Leaf", value: "deep-value" }],
            files: [],
            groups: [],
          },
        ],
      },
    ]);
  });

  it("treats a SubmodelElementCollection with a non-array value as an empty group", async () => {
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

    expect(result?.submodels[0].groups).toEqual([
      { idShort: "Broken", displayName: null, properties: [], files: [], groups: [] },
    ]);
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
    // one past MAX_COLLECTION_DEPTH (10), so that innermost group must come
    // back empty (pruned before its Property is ever read).
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

    function deepestGroup(group: { groups: unknown[] }): unknown {
      const groups = group.groups as { groups: unknown[] }[];
      return groups.length > 0 ? deepestGroup(groups[0]) : group;
    }
    const innermost = deepestGroup(result!.submodels[0]) as {
      properties: unknown[];
      groups: unknown[];
    };
    expect(innermost.properties).toEqual([]);
    expect(innermost.groups).toEqual([]);
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

  describe("submodel display metadata", () => {
    async function submodelResult(submodel: Record<string, unknown>) {
      const fetchMock = vi.fn(async (url: string) =>
        fetchOne(url, {
          "http://vendor.example/shells/abc": shell,
          [`http://vendor.example/shells/${encode(shell.id)}/submodel-refs`]: {
            result: [{ keys: [{ type: "Submodel", value: submodel.id }] }],
          },
          [`http://vendor.example/submodels/${encode(submodel.id as string)}`]: submodel,
        })
      );
      vi.stubGlobal("fetch", fetchMock);
      const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });
      return result!.submodels[0];
    }

    it("prefers the English displayName entry", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        idShort: "Nameplate",
        displayName: [
          { language: "de", text: "Typenschild" },
          { language: "en", text: "Nameplate" },
        ],
      });

      expect(submodel.displayName).toBe("Nameplate");
    });

    it("falls back to the first displayName entry when English is absent", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        displayName: [{ language: "de", text: "Typenschild" }],
      });

      expect(submodel.displayName).toBe("Typenschild");
    });

    it("returns a null displayName when the submodel has none", async () => {
      const submodel = await submodelResult({ id: "https://example.com/sm/1" });

      expect(submodel.displayName).toBeNull();
    });

    it("prefers the English description entry", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        description: [
          { language: "de", text: "Enthält Typenschildinformationen" },
          { language: "en", text: "Contains nameplate information" },
        ],
      });

      expect(submodel.description).toBe("Contains nameplate information");
    });

    it("resolves the version from administration.version and revision", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        administration: { version: "1", revision: "2" },
      });

      expect(submodel.version).toBe("1.2");
    });

    it("resolves the version from administration.version alone when there is no revision", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        administration: { version: "1" },
      });

      expect(submodel.version).toBe("1");
    });

    it("resolves the templateName and version from a known IDTA/ZVEI semanticId when administration is absent", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        idShort: "Nameplate",
        semanticId: {
          keys: [{ type: "GlobalReference", value: "https://admin-shell.io/zvei/nameplate/2/0/Nameplate" }],
        },
      });

      expect(submodel.templateName).toBe("Digital Nameplate for industrial equipment");
      expect(submodel.version).toBe("2.0");
    });

    it("resolves the version from the semanticId's own version/revision segment when the semanticId isn't a known template", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        semanticId: {
          keys: [{ type: "GlobalReference", value: "https://example.com/some/vendor/schema/3/1" }],
        },
      });

      expect(submodel.templateName).toBeNull();
      expect(submodel.version).toBe("3.1");
    });

    it("returns a null version when nothing yields one", async () => {
      const submodel = await submodelResult({ id: "https://example.com/sm/1" });

      expect(submodel.version).toBeNull();
    });

    it("ignores an administration object with no version", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        administration: { revision: "2" },
      });

      expect(submodel.version).toBeNull();
    });

    it("returns a null version when the semanticId doesn't contain a version/revision segment", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        semanticId: {
          keys: [{ type: "GlobalReference", value: "https://example.com/some/vendor/schema" }],
        },
      });

      expect(submodel.version).toBeNull();
    });

    it("ignores a semanticId with no keys", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        semanticId: { keys: [] },
      });

      expect(submodel.templateName).toBeNull();
      expect(submodel.version).toBeNull();
    });

    it("ignores a non-object semanticId", async () => {
      const submodel = await submodelResult({
        id: "https://example.com/sm/1",
        semanticId: "not-an-object",
      });

      expect(submodel.templateName).toBeNull();
    });
  });

  describe("group displayName resolution", () => {
    it("uses a SubmodelElementCollection's own displayName when present", async () => {
      const submodel = {
        id: "https://example.com/sm/1",
        submodelElements: [
          {
            modelType: "SubmodelElementCollection",
            idShort: "GeneralInformation",
            displayName: [{ language: "en", text: "General Information" }],
            value: [],
          },
        ],
      };
      const fetchMock = vi.fn(async (url: string) =>
        fetchOne(url, {
          "http://vendor.example/shells/abc": shell,
          [`http://vendor.example/shells/${encode(shell.id)}/submodel-refs`]: {
            result: [{ keys: [{ type: "Submodel", value: submodel.id }] }],
          },
          [`http://vendor.example/submodels/${encode(submodel.id)}`]: submodel,
        })
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await getAasData({ aasEndpointUrl: "http://vendor.example/shells/abc" });

      expect(result?.submodels[0].groups[0].displayName).toBe("General Information");
    });
  });
});

describe("getRawAasData", () => {
  it("returns the untransformed shell and submodel JSON", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      fetchOne(url, {
        "http://vendor.example/shells/abc": shell,
        [`http://vendor.example/shells/${encode(shell.id)}/submodel-refs`]: submodelRefsPage,
        [`http://vendor.example/submodels/${encode(nameplateSubmodel.id)}`]: nameplateSubmodel,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getRawAasData({
      aasEndpointUrl: "http://vendor.example/shells/abc",
    });

    expect(result).toEqual({
      shell,
      submodels: [nameplateSubmodel],
    });
  });

  it("returns null when neither aasEndpointUrl nor aasGlobalAssetId is set", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await getRawAasData({})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the shell can't be resolved", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    const result = await getRawAasData({
      aasEndpointUrl: "http://vendor.example/shells/abc",
    });

    expect(result).toBeNull();
  });

  it("returns null when the resolved shell has no id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ idShort: "NoId" }))
    );

    const result = await getRawAasData({
      aasEndpointUrl: "http://vendor.example/shells/abc",
    });

    expect(result).toBeNull();
  });
});

describe("toAasData", () => {
  it("transforms a raw shell and submodels into the display shape", () => {
    const result = toAasData({ shell, submodels: [nameplateSubmodel] });

    expect(result).toEqual({
      id: shell.id,
      idShort: "Lathe1",
      submodels: [
        {
          id: nameplateSubmodel.id,
          idShort: "Nameplate",
          displayName: null,
          description: null,
          templateName: null,
          version: null,
          properties: [
            { idShort: "ManufacturerName", value: "Acme Machine Works" },
            { idShort: "YearOfConstruction", value: "2019" },
          ],
          files: [],
          groups: [],
        },
      ],
    });
  });

  it("falls back to empty id/idShort when the shell lacks them", () => {
    const result = toAasData({ shell: {}, submodels: [] });

    expect(result).toEqual({ id: "", idShort: "", submodels: [] });
  });
});

describe("encodeAasId", () => {
  it("base64url-encodes an id", () => {
    expect(encodeAasId("https://example.com/aas/abc")).toBe(
      encode("https://example.com/aas/abc")
    );
  });
});
