import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    asset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next/navigation", () => ({ notFound }));

const { getAssets, getAssetById, getAssetByIdOrNotFound, getAssetCount } =
  await import("./assets");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAssets", () => {
  it("queries all assets ordered by most recently updated", async () => {
    prisma.asset.findMany.mockResolvedValue([{ id: "1" }]);

    const result = await getAssets();

    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
      omit: { assetImage: true, nameplateImage: true },
    });
    expect(result).toEqual([{ id: "1" }]);
  });
});

describe("getAssetById", () => {
  it("queries a single asset by id", async () => {
    prisma.asset.findUnique.mockResolvedValue({ id: "1" });

    const result = await getAssetById("1");

    expect(prisma.asset.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      omit: { assetImage: true, nameplateImage: true },
    });
    expect(result).toEqual({ id: "1" });
  });
});

describe("getAssetByIdOrNotFound", () => {
  it("returns the asset when found", async () => {
    prisma.asset.findUnique.mockResolvedValue({ id: "1" });

    const result = await getAssetByIdOrNotFound("1");

    expect(result).toEqual({ id: "1" });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("calls notFound when the asset does not exist", async () => {
    prisma.asset.findUnique.mockResolvedValue(null);

    await expect(getAssetByIdOrNotFound("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });
});

describe("getAssetCount", () => {
  it("returns the total number of assets", async () => {
    prisma.asset.count.mockResolvedValue(5);

    const result = await getAssetCount();

    expect(prisma.asset.count).toHaveBeenCalledWith();
    expect(result).toBe(5);
  });
});
