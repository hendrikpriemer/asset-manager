import { describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    aasRepository: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

const { getAasRepositories } = await import("./aas-repositories");

describe("getAasRepositories", () => {
  it("returns repositories ordered by name", async () => {
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
    ]);

    const result = await getAasRepositories();

    expect(prisma.aasRepository.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    });
    expect(result).toEqual([
      { id: "1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
    ]);
  });
});
