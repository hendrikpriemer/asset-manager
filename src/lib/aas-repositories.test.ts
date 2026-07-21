import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    aasRepository: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
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

const {
  getAasRepositories,
  getAasRepositoryById,
  getAasRepositoryByIdOrNotFound,
  ensureLocalMirrorRepository,
} = await import("./aas-repositories");

const MIRROR_URL = "http://basyx-aas-env:8081";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAasRepositories", () => {
  it("ensures the local mirror exists, then returns repositories ordered by name", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", MIRROR_URL);
    prisma.aasRepository.findFirst.mockResolvedValue({
      id: "mirror-1",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });
    prisma.aasRepository.findMany.mockResolvedValue([
      { id: "1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
    ]);

    const result = await getAasRepositories();

    expect(prisma.aasRepository.findFirst).toHaveBeenCalledWith({
      where: { isLocalMirror: true },
    });
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

describe("ensureLocalMirrorRepository", () => {
  it("returns the existing mirror unchanged when its baseUrl already matches", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", MIRROR_URL);
    const mirrorRow = { id: "mirror-1", baseUrl: MIRROR_URL, isLocalMirror: true };
    prisma.aasRepository.findFirst.mockResolvedValueOnce(mirrorRow);

    const result = await ensureLocalMirrorRepository();

    expect(result).toEqual(mirrorRow);
    expect(prisma.aasRepository.update).not.toHaveBeenCalled();
    expect(prisma.aasRepository.create).not.toHaveBeenCalled();
  });

  it("updates the existing mirror's baseUrl when it has drifted from the env var", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", MIRROR_URL);
    prisma.aasRepository.findFirst.mockResolvedValueOnce({
      id: "mirror-1",
      baseUrl: "http://old-basyx:8081",
      isLocalMirror: true,
    });
    prisma.aasRepository.update.mockResolvedValue({
      id: "mirror-1",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });

    const result = await ensureLocalMirrorRepository();

    expect(prisma.aasRepository.update).toHaveBeenCalledWith({
      where: { id: "mirror-1" },
      data: { baseUrl: MIRROR_URL },
    });
    expect(result).toEqual({ id: "mirror-1", baseUrl: MIRROR_URL, isLocalMirror: true });
  });

  it("promotes an existing repository matching the mirror URL by baseUrl", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", MIRROR_URL);
    prisma.aasRepository.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "seed-1",
        name: "Local BaSyx (dev)",
        baseUrl: MIRROR_URL,
        isLocalMirror: false,
      });
    prisma.aasRepository.update.mockResolvedValue({
      id: "seed-1",
      name: "Local AAS Mirror",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });

    const result = await ensureLocalMirrorRepository();

    expect(prisma.aasRepository.findFirst).toHaveBeenNthCalledWith(1, {
      where: { isLocalMirror: true },
    });
    expect(prisma.aasRepository.findFirst).toHaveBeenNthCalledWith(2, {
      where: { baseUrl: MIRROR_URL },
    });
    expect(prisma.aasRepository.update).toHaveBeenCalledWith({
      where: { id: "seed-1" },
      data: { name: "Local AAS Mirror", isLocalMirror: true },
    });
    expect(result).toEqual({
      id: "seed-1",
      name: "Local AAS Mirror",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });
  });

  it("creates a new mirror repository when none exists yet", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", MIRROR_URL);
    prisma.aasRepository.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.aasRepository.create.mockResolvedValue({
      id: "new-1",
      name: "Local AAS Mirror",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });

    const result = await ensureLocalMirrorRepository();

    expect(prisma.aasRepository.create).toHaveBeenCalledWith({
      data: { name: "Local AAS Mirror", baseUrl: MIRROR_URL, isLocalMirror: true },
    });
    expect(result).toEqual({
      id: "new-1",
      name: "Local AAS Mirror",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });
  });

  it("falls back to the default local basyx URL when LOCAL_AAS_MIRROR_URL is unset", async () => {
    vi.stubEnv("LOCAL_AAS_MIRROR_URL", "");
    prisma.aasRepository.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.aasRepository.create.mockResolvedValue({
      id: "new-1",
      name: "Local AAS Mirror",
      baseUrl: MIRROR_URL,
      isLocalMirror: true,
    });

    await ensureLocalMirrorRepository();

    expect(prisma.aasRepository.create).toHaveBeenCalledWith({
      data: { name: "Local AAS Mirror", baseUrl: MIRROR_URL, isLocalMirror: true },
    });
  });
});
