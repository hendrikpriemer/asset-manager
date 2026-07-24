import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAasData } = vi.hoisted(() => ({ getAasData: vi.fn() }));
const { identifyAssetFromNameplate } = vi.hoisted(() => ({
  identifyAssetFromNameplate: vi.fn(),
}));
const { lookupCoordinatesForAddress } = vi.hoisted(() => ({
  lookupCoordinatesForAddress: vi.fn(),
}));

vi.mock("@/lib/aas", () => ({ getAasData }));
vi.mock("@/lib/nameplate-identification", () => ({ identifyAssetFromNameplate }));
vi.mock("@/lib/timezone", () => ({ lookupCoordinatesForAddress }));

const { resolveAasReference, checkAasReference, lookupNameplateCoordinates } = await import(
  "./aas-actions"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveAasReference", () => {
  it("resolves directly when the reference (endpoint URL) is already correct", async () => {
    getAasData.mockResolvedValue({
      id: "https://example.com/aas/abc",
      idShort: "TestLathe1",
      submodels: [],
    });

    const result = await resolveAasReference(
      { aasEndpointUrl: "http://example.com/shells/abc", aasGlobalAssetId: null },
      "http://example.com/shells/abc"
    );

    expect(result).toEqual({
      reference: { aasEndpointUrl: "http://example.com/shells/abc", aasGlobalAssetId: null },
      idShort: "TestLathe1",
      matchedGlobalAssetId: null,
    });
    expect(identifyAssetFromNameplate).not.toHaveBeenCalled();
  });

  it("falls back to the repository search when a bare globalAssetId doesn't resolve directly", async () => {
    getAasData.mockResolvedValue(null);
    const aasData = { id: "https://dt.r-stahl.com/aas/instance/10003506595", idShort: "x", submodels: [] };
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      aasData,
    });

    const result = await resolveAasReference(
      { aasEndpointUrl: null, aasGlobalAssetId: "10003506595" },
      "10003506595"
    );

    expect(identifyAssetFromNameplate).toHaveBeenCalledWith("10003506595");
    expect(result).toEqual({
      reference: {
        aasEndpointUrl: null,
        aasGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      },
      idShort: "x",
      matchedGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
    });
  });

  it("falls back to the matched shell's raw id when its idShort is blank", async () => {
    getAasData.mockResolvedValue(null);
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      aasData: { id: "https://dt.r-stahl.com/aas/instance/10003506595", idShort: "", submodels: [] },
    });

    const result = await resolveAasReference(
      { aasEndpointUrl: null, aasGlobalAssetId: "10003506595" },
      "10003506595"
    );

    expect(result?.idShort).toBe("https://dt.r-stahl.com/aas/instance/10003506595");
  });

  it("does not fall back to the repository search when an endpoint URL was given but didn't resolve", async () => {
    getAasData.mockResolvedValue(null);

    const result = await resolveAasReference(
      { aasEndpointUrl: "http://example.com/shells/wrong", aasGlobalAssetId: null },
      "http://example.com/shells/wrong"
    );

    expect(identifyAssetFromNameplate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it("returns null when neither direct resolution nor the repository search finds anything", async () => {
    getAasData.mockResolvedValue(null);
    identifyAssetFromNameplate.mockResolvedValue(null);

    const result = await resolveAasReference(
      { aasEndpointUrl: null, aasGlobalAssetId: "no-such-code" },
      "no-such-code"
    );

    expect(result).toBeNull();
  });
});

describe("checkAasReference", () => {
  it("returns unresolved when the reference could not be resolved", async () => {
    getAasData.mockResolvedValue(null);
    identifyAssetFromNameplate.mockResolvedValue(null);

    const result = await checkAasReference(
      { aasEndpointUrl: "http://example.com/shells/abc", aasGlobalAssetId: null },
      "http://example.com/shells/abc"
    );

    expect(result).toEqual({ status: "unresolved" });
  });

  it("returns resolved with the shell's idShort and no matchedGlobalAssetId when resolved directly", async () => {
    getAasData.mockResolvedValue({
      id: "https://example.com/aas/abc",
      idShort: "TestLathe1",
      submodels: [],
    });

    const result = await checkAasReference(
      { aasEndpointUrl: "http://example.com/shells/abc", aasGlobalAssetId: null },
      "http://example.com/shells/abc"
    );

    expect(result).toEqual({
      status: "resolved",
      idShort: "TestLathe1",
      matchedGlobalAssetId: null,
    });
  });

  it("falls back to the raw id when idShort is blank", async () => {
    getAasData.mockResolvedValue({
      id: "https://example.com/aas/abc",
      idShort: "",
      submodels: [],
    });

    const result = await checkAasReference(
      { aasEndpointUrl: "http://example.com/shells/abc", aasGlobalAssetId: null },
      "http://example.com/shells/abc"
    );

    expect(result).toEqual({
      status: "resolved",
      idShort: "https://example.com/aas/abc",
      matchedGlobalAssetId: null,
    });
  });

  it("surfaces the matched globalAssetId when the repository search resolves a bare material/serial number", async () => {
    getAasData.mockResolvedValue(null);
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      aasData: { id: "x", idShort: "x", submodels: [] },
    });

    const result = await checkAasReference(
      { aasEndpointUrl: null, aasGlobalAssetId: "10003506595" },
      "10003506595"
    );

    expect(result).toEqual({
      status: "resolved",
      idShort: "x",
      matchedGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
    });
  });
});

describe("lookupNameplateCoordinates", () => {
  it("delegates to the shared geocoding lookup", async () => {
    lookupCoordinatesForAddress.mockResolvedValue({ lat: 52.29, lon: 8.91 });

    const result = await lookupNameplateCoordinates("Minden, Germany");

    expect(result).toEqual({ lat: 52.29, lon: 8.91 });
    expect(lookupCoordinatesForAddress).toHaveBeenCalledWith("Minden, Germany");
  });

  it("returns null when the address can't be geocoded", async () => {
    lookupCoordinatesForAddress.mockResolvedValue(null);

    expect(await lookupNameplateCoordinates("Nowhere")).toBeNull();
  });
});
