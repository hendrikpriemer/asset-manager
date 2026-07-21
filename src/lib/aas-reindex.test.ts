import { describe, expect, it, vi } from "vitest";

const { getRawAasData, toAasData } = vi.hoisted(() => ({
  getRawAasData: vi.fn(),
  toAasData: vi.fn(),
}));
const { buildAasSearchText } = vi.hoisted(() => ({
  buildAasSearchText: vi.fn(),
}));
const { mirrorAasDataToLocalRepo } = vi.hoisted(() => ({
  mirrorAasDataToLocalRepo: vi.fn(),
}));

vi.mock("@/lib/aas", () => ({ getRawAasData, toAasData }));
vi.mock("@/lib/aas-search-text", () => ({ buildAasSearchText }));
vi.mock("@/lib/aas-mirror", () => ({ mirrorAasDataToLocalRepo }));

const { reindexAssetAas } = await import("./aas-reindex");

describe("reindexAssetAas", () => {
  it("returns no-reference without fetching when neither field is set", async () => {
    const result = await reindexAssetAas({});

    expect(result).toEqual({ status: "no-reference" });
    expect(getRawAasData).not.toHaveBeenCalled();
  });

  it("returns failed when the raw AAS data can't be resolved", async () => {
    getRawAasData.mockResolvedValue(null);

    const result = await reindexAssetAas({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result).toEqual({ status: "failed" });
  });

  it("builds the search text and mirrors from the same raw fetch, reporting the mirror status", async () => {
    const raw = { shell: { id: "abc" }, submodels: [] };
    const transformed = { id: "abc", idShort: "Abc", submodels: [] };
    getRawAasData.mockResolvedValue(raw);
    toAasData.mockReturnValue(transformed);
    buildAasSearchText.mockReturnValue("abc searchable text");
    mirrorAasDataToLocalRepo.mockResolvedValue("mirrored");

    const result = await reindexAssetAas({ aasGlobalAssetId: "https://example.com/assets/abc" });

    expect(result).toEqual({ status: "ok", text: "abc searchable text", mirror: "mirrored" });
    expect(toAasData).toHaveBeenCalledWith(raw);
    expect(buildAasSearchText).toHaveBeenCalledWith(transformed);
    expect(mirrorAasDataToLocalRepo).toHaveBeenCalledWith(raw);
  });

  it("still reports ok when mirroring fails - a failed mirror doesn't block the search text update", async () => {
    getRawAasData.mockResolvedValue({ shell: { id: "abc" }, submodels: [] });
    toAasData.mockReturnValue({ id: "abc", idShort: "Abc", submodels: [] });
    buildAasSearchText.mockReturnValue("abc searchable text");
    mirrorAasDataToLocalRepo.mockResolvedValue("mirror-failed");

    const result = await reindexAssetAas({ aasEndpointUrl: "http://vendor.example/shells/abc" });

    expect(result).toEqual({
      status: "ok",
      text: "abc searchable text",
      mirror: "mirror-failed",
    });
  });
});
