import { describe, expect, it, vi } from "vitest";

const { getAasData } = vi.hoisted(() => ({ getAasData: vi.fn() }));

vi.mock("@/lib/aas", () => ({ getAasData }));

const { checkAasReference } = await import("./aas-actions");

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
