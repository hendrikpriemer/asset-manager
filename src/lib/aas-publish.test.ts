import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { ensureLocalMirrorRepository } = vi.hoisted(() => ({
  ensureLocalMirrorRepository: vi.fn(),
}));
const { mirrorAasDataToLocalRepo } = vi.hoisted(() => ({
  mirrorAasDataToLocalRepo: vi.fn(),
}));

vi.mock("@/lib/aas-repositories", () => ({ ensureLocalMirrorRepository }));
vi.mock("@/lib/aas-mirror", () => ({ mirrorAasDataToLocalRepo }));

const {
  assetShellId,
  assetMetadataSubmodelId,
  buildAssetShell,
  buildAssetMetadataSubmodel,
  publishAssetAas,
  unpublishAssetAas,
} = await import("./aas-publish");

const LOCAL_BASE = "http://basyx-aas-env:8081";

function encode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

const baseAsset = {
  id: "asset-1",
  name: "Lathe",
  description: null,
  structureNodeId: null,
  aasEndpointUrl: null,
  aasGlobalAssetId: null,
};

beforeEach(() => {
  ensureLocalMirrorRepository.mockReset().mockResolvedValue({
    id: "repo-1",
    name: "Local AAS Mirror",
    baseUrl: LOCAL_BASE,
    isLocalMirror: true,
  });
  mirrorAasDataToLocalRepo.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("assetShellId / assetMetadataSubmodelId", () => {
  it("derives stable, distinct ids from the asset id", () => {
    expect(assetShellId("asset-1")).toBe("https://asset-manager.internal/aas/asset-1");
    expect(assetMetadataSubmodelId("asset-1")).toBe(
      "https://asset-manager.internal/sm/asset-1/metadata"
    );
  });
});

describe("buildAssetShell", () => {
  it("builds a shell referencing the asset's own metadata submodel", () => {
    const shell = buildAssetShell(baseAsset);

    expect(shell).toEqual({
      modelType: "AssetAdministrationShell",
      id: "https://asset-manager.internal/aas/asset-1",
      idShort: "Lathe",
      assetInformation: {
        assetKind: "Instance",
        globalAssetId: "https://asset-manager.internal/aas/asset-1",
      },
      submodels: [
        {
          type: "ModelReference",
          keys: [
            {
              type: "Submodel",
              value: "https://asset-manager.internal/sm/asset-1/metadata",
            },
          ],
        },
      ],
    });
  });
});

describe("buildAssetMetadataSubmodel", () => {
  it("includes only the name property when nothing else is set", () => {
    const submodel = buildAssetMetadataSubmodel(baseAsset);

    expect(submodel.id).toBe("https://asset-manager.internal/sm/asset-1/metadata");
    expect(submodel.idShort).toBe("AssetManagerMetadata");
    expect(submodel.submodelElements).toEqual([
      { modelType: "Property", idShort: "name", valueType: "xs:string", value: "Lathe" },
    ]);
  });

  it("includes description, structureNodeId, and linked AAS reference properties when set", () => {
    const submodel = buildAssetMetadataSubmodel({
      ...baseAsset,
      description: "Main production lathe",
      structureNodeId: "node-1",
      aasEndpointUrl: "https://vendor.example/shells/abc",
      aasGlobalAssetId: null,
    });

    expect(submodel.submodelElements).toEqual([
      { modelType: "Property", idShort: "name", valueType: "xs:string", value: "Lathe" },
      {
        modelType: "Property",
        idShort: "description",
        valueType: "xs:string",
        value: "Main production lathe",
      },
      {
        modelType: "Property",
        idShort: "structureNodeId",
        valueType: "xs:string",
        value: "node-1",
      },
      {
        modelType: "Property",
        idShort: "linkedAasEndpointUrl",
        valueType: "xs:string",
        value: "https://vendor.example/shells/abc",
      },
    ]);
  });

  it("includes the linked globalAssetId property when set instead of an endpoint URL", () => {
    const submodel = buildAssetMetadataSubmodel({
      ...baseAsset,
      aasGlobalAssetId: "https://wago.com/ids/aas/123",
    });

    expect(submodel.submodelElements).toContainEqual({
      modelType: "Property",
      idShort: "linkedAasGlobalAssetId",
      valueType: "xs:string",
      value: "https://wago.com/ids/aas/123",
    });
  });
});

describe("publishAssetAas", () => {
  it("mirrors the built shell and submodel, translating a successful status", async () => {
    mirrorAasDataToLocalRepo.mockResolvedValue("mirrored");

    const result = await publishAssetAas(baseAsset);

    expect(result).toBe("published");
    expect(mirrorAasDataToLocalRepo).toHaveBeenCalledWith({
      shell: buildAssetShell(baseAsset),
      submodels: [buildAssetMetadataSubmodel(baseAsset)],
    });
  });

  it("translates a failed mirror status", async () => {
    mirrorAasDataToLocalRepo.mockResolvedValue("mirror-failed");

    const result = await publishAssetAas(baseAsset);

    expect(result).toBe("publish-failed");
  });
});

describe("unpublishAssetAas", () => {
  it("deletes the submodel and shell from the local mirror", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    await unpublishAssetAas("asset-1");

    expect(fetchMock).toHaveBeenCalledWith(
      `${LOCAL_BASE}/submodels/${encode("https://asset-manager.internal/sm/asset-1/metadata")}`,
      expect.objectContaining({ method: "DELETE" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${LOCAL_BASE}/shells/${encode("https://asset-manager.internal/aas/asset-1")}`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("swallows errors instead of throwing (best effort)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(unpublishAssetAas("asset-1")).resolves.toBeUndefined();
  });
});
