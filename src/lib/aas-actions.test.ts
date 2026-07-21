import { describe, expect, it, vi } from "vitest";

const { getAasData } = vi.hoisted(() => ({ getAasData: vi.fn() }));
const { lookupCoordinatesForAddress } = vi.hoisted(() => ({
  lookupCoordinatesForAddress: vi.fn(),
}));

vi.mock("@/lib/aas", () => ({ getAasData }));
vi.mock("@/lib/timezone", () => ({ lookupCoordinatesForAddress }));

const { checkAasReference, lookupNameplateCoordinates } = await import(
  "./aas-actions"
);

describe("checkAasReference", () => {
  it("returns unresolved when the reference could not be resolved", async () => {
    getAasData.mockResolvedValue(null);

    const result = await checkAasReference({
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });

    expect(result).toEqual({ status: "unresolved" });
  });

  it("returns resolved with the shell's idShort when found", async () => {
    getAasData.mockResolvedValue({
      id: "https://example.com/aas/abc",
      idShort: "TestLathe1",
      submodels: [],
    });

    const result = await checkAasReference({
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });

    expect(result).toEqual({ status: "resolved", idShort: "TestLathe1" });
  });

  it("falls back to the raw id when idShort is blank", async () => {
    getAasData.mockResolvedValue({
      id: "https://example.com/aas/abc",
      idShort: "",
      submodels: [],
    });

    const result = await checkAasReference({
      aasEndpointUrl: "http://example.com/shells/abc",
      aasGlobalAssetId: null,
    });

    expect(result).toEqual({
      status: "resolved",
      idShort: "https://example.com/aas/abc",
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
