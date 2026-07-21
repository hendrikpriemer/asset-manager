import { describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    aasRepository: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

const { getAasRepositories, getAasRepositoryById, getAasRepositoryByIdOrNotFound } =
  await import("./aas-repositories");

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

describe("getAasRepositoryById", () => {
  it("queries a repository by id", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue({
      id: "1",
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com",
    });

    const result = await getAasRepositoryById("1");

    expect(prisma.aasRepository.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(result).toEqual({ id: "1", name: "WAGO", baseUrl: "https://c1.api.wago.com" });
  });
});

describe("getAasRepositoryByIdOrNotFound", () => {
  it("returns the repository when found", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue({
      id: "1",
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com",
    });

    const result = await getAasRepositoryByIdOrNotFound("1");

    expect(result).toEqual({ id: "1", name: "WAGO", baseUrl: "https://c1.api.wago.com" });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("calls notFound when the repository does not exist", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue(null);

    await expect(getAasRepositoryByIdOrNotFound("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });
});
