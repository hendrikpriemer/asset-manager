import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    asset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

const { getAssets, getAssetById } = await import("./assets");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAssets", () => {
  it("queries all assets ordered by most recently updated", async () => {
    prisma.asset.findMany.mockResolvedValue([{ id: "1" }]);

    const result = await getAssets();

    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      orderBy: { updatedAt: "desc" },
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
    });
    expect(result).toEqual({ id: "1" });
  });
});
