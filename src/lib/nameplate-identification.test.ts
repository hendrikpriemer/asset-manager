import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { aasRepository: { findMany: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { getAasData } = vi.hoisted(() => ({ getAasData: vi.fn() }));
vi.mock("@/lib/aas", () => ({ getAasData }));

const { identifyAssetFromNameplate } = await import("./nameplate-identification");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("identifyAssetFromNameplate", () => {
  it("returns null immediately without querying anything when there is no article number", async () => {
    const result = await identifyAssetFromNameplate(null);

    expect(result).toBeNull();
    expect(prisma.aasRepository.findMany).not.toHaveBeenCalled();
  });

  it("builds a WAGO candidate globalAssetId and returns the match when it resolves", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { name: "WAGO", isLocalMirror: false },
    ]);
    const aasData = { id: "https://wago.com/ids/aas/750-451", idShort: "750-451", submodels: [] };
    getAasData.mockResolvedValue(aasData);

    const result = await identifyAssetFromNameplate("750-451");

    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/750-451",
    });
    expect(result).toEqual({
      globalAssetId: "https://wago.com/ids/assets/750-451",
      aasData,
    });
  });

  it("matches a WAGO repository name case-insensitively", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "wago", isLocalMirror: false }]);
    getAasData.mockResolvedValue({ id: "x", idShort: "x", submodels: [] });

    await identifyAssetFromNameplate("750-451");

    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/750-451",
    });
  });

  it("excludes the local mirror repository from the query", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([]);

    await identifyAssetFromNameplate("750-451");

    expect(prisma.aasRepository.findMany).toHaveBeenCalledWith({
      where: { isLocalMirror: false },
    });
  });

  it("returns null when no configured repository matches a known manufacturer pattern", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { name: "Some Other Vendor", isLocalMirror: false },
    ]);

    const result = await identifyAssetFromNameplate("750-451");

    expect(result).toBeNull();
    expect(getAasData).not.toHaveBeenCalled();
  });

  it("returns null when the candidate globalAssetId does not resolve to any real shell", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { name: "WAGO", isLocalMirror: false },
    ]);
    getAasData.mockResolvedValue(null);

    const result = await identifyAssetFromNameplate("no-such-article");

    expect(result).toBeNull();
  });

  it("tries the next candidate when an earlier one does not resolve", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { name: "WAGO", isLocalMirror: false },
      { name: "WAGO Backup Mirror", isLocalMirror: false },
    ]);
    const aasData = { id: "x", idShort: "x", submodels: [] };
    getAasData.mockResolvedValueOnce(null).mockResolvedValueOnce(aasData);

    const result = await identifyAssetFromNameplate("750-451");

    expect(getAasData).toHaveBeenCalledTimes(2);
    expect(result?.aasData).toBe(aasData);
  });

  it("also tries an OCR-error-corrected variant (O→0, I/l→1) when the raw guess doesn't resolve", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "WAGO", isLocalMirror: false }]);
    const aasData = { id: "x", idShort: "750-451", submodels: [] };
    getAasData.mockImplementation(async ({ aasGlobalAssetId }: { aasGlobalAssetId: string }) =>
      aasGlobalAssetId === "https://wago.com/ids/assets/750-451" ? aasData : null
    );

    const result = await identifyAssetFromNameplate("75O-45I");

    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/75O-45I",
    });
    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/750-451",
    });
    expect(result?.aasData).toBe(aasData);
  });

  it("strips stray whitespace when building the corrected variant", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "WAGO", isLocalMirror: false }]);
    const aasData = { id: "x", idShort: "750-451", submodels: [] };
    getAasData.mockImplementation(async ({ aasGlobalAssetId }: { aasGlobalAssetId: string }) =>
      aasGlobalAssetId === "https://wago.com/ids/assets/750-451" ? aasData : null
    );

    const result = await identifyAssetFromNameplate("750 - 451");

    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/750 - 451",
    });
    expect(getAasData).toHaveBeenCalledWith({
      aasGlobalAssetId: "https://wago.com/ids/assets/750-451",
    });
    expect(result?.aasData).toBe(aasData);
  });

  it("does not try a second variant when the article number has no easily-confused characters", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "WAGO", isLocalMirror: false }]);
    getAasData.mockResolvedValue({ id: "x", idShort: "750-451", submodels: [] });

    await identifyAssetFromNameplate("750-451");

    expect(getAasData).toHaveBeenCalledTimes(1);
  });
});
