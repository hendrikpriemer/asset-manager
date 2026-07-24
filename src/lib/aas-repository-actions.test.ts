import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

const { prisma } = vi.hoisted(() => ({
  prisma: {
    aasRepository: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));

const {
  createAasRepository,
  updateAasRepository,
  deleteAasRepository,
  testAasRepositoryConnection,
} = await import("./aas-repository-actions");

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("createAasRepository", () => {
  it("creates the repository and revalidates on valid input", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue(null);
    const formData = formDataWith({
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });

    const result = await createAasRepository({ error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.aasRepository.create).toHaveBeenCalledWith({
      data: { name: "WAGO", baseUrl: "https://c1.api.wago.com/smartdata-aas-env" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/aas-repositories");
  });

  it("returns an error and does not persist on invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await createAasRepository({ error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.aasRepository.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error and does not persist when the base URL is already configured", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue({
      id: "existing",
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });
    const formData = formDataWith({
      name: "WAGO (duplicate)",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });

    const result = await createAasRepository({ error: null }, formData);

    expect(result).toEqual({
      error: "A repository with this base URL is already configured.",
    });
    expect(prisma.aasRepository.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of swallowing them", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(createAasRepository({ error: null }, formData)).rejects.toThrow(
      "boom"
    );
    expect(prisma.aasRepository.create).not.toHaveBeenCalled();
  });
});

describe("updateAasRepository", () => {
  it("updates the repository and revalidates on valid input", async () => {
    prisma.aasRepository.findUnique
      .mockResolvedValueOnce({ id: "repo-1", isLocalMirror: false })
      .mockResolvedValueOnce(null);
    const formData = formDataWith({
      name: "WAGO (renamed)",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });

    const result = await updateAasRepository("repo-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.aasRepository.update).toHaveBeenCalledWith({
      where: { id: "repo-1" },
      data: { name: "WAGO (renamed)", baseUrl: "https://c1.api.wago.com/smartdata-aas-env" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/aas-repositories");
  });

  it("allows re-saving a repository with its own unchanged base URL", async () => {
    const existingRow = {
      id: "repo-1",
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
      isLocalMirror: false,
    };
    prisma.aasRepository.findUnique
      .mockResolvedValueOnce(existingRow)
      .mockResolvedValueOnce(existingRow);
    const formData = formDataWith({
      name: "WAGO (renamed)",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });

    const result = await updateAasRepository("repo-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.aasRepository.update).toHaveBeenCalledTimes(1);
  });

  it("returns an error and does not persist on invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await updateAasRepository("repo-1", { error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.aasRepository.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error and does not persist when the base URL collides with a different repository", async () => {
    prisma.aasRepository.findUnique
      .mockResolvedValueOnce({ id: "repo-1", isLocalMirror: false })
      .mockResolvedValueOnce({
        id: "repo-2",
        name: "Other",
        baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
      });
    const formData = formDataWith({
      name: "WAGO",
      baseUrl: "https://c1.api.wago.com/smartdata-aas-env",
    });

    const result = await updateAasRepository("repo-1", { error: null }, formData);

    expect(result).toEqual({
      error: "A repository with this base URL is already configured.",
    });
    expect(prisma.aasRepository.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error and does not modify the local mirror repository", async () => {
    prisma.aasRepository.findUnique.mockResolvedValueOnce({
      id: "mirror-1",
      isLocalMirror: true,
    });
    const formData = formDataWith({
      name: "Renamed mirror",
      baseUrl: "http://basyx-aas-env:8081",
    });

    const result = await updateAasRepository("mirror-1", { error: null }, formData);

    expect(result).toEqual({
      error:
        "The local AAS mirror is managed by the platform and can't be edited or deleted.",
    });
    expect(prisma.aasRepository.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.aasRepository.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of swallowing them", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(
      updateAasRepository("repo-1", { error: null }, formData)
    ).rejects.toThrow("boom");
    expect(prisma.aasRepository.update).not.toHaveBeenCalled();
  });
});

describe("deleteAasRepository", () => {
  it("deletes the repository and revalidates the settings page", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue({
      id: "repo-1",
      isLocalMirror: false,
    });

    await deleteAasRepository("repo-1");

    expect(prisma.aasRepository.delete).toHaveBeenCalledWith({
      where: { id: "repo-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/aas-repositories");
  });

  it("throws and does not delete the local mirror repository", async () => {
    prisma.aasRepository.findUnique.mockResolvedValue({
      id: "mirror-1",
      isLocalMirror: true,
    });

    await expect(deleteAasRepository("mirror-1")).rejects.toThrow(
      "The local AAS mirror is managed by the platform and can't be edited or deleted."
    );
    expect(prisma.aasRepository.delete).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("testAasRepositoryConnection", () => {
  it("returns unreachable without calling fetch for an empty or whitespace base URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await testAasRepositoryConnection("")).toEqual({ status: "unreachable" });
    expect(await testAasRepositoryConnection("   ")).toEqual({ status: "unreachable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns reachable when the shells endpoint responds ok on the first attempt", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://c1.api.wago.com/smartdata-aas-env/shells?limit=1");
      return { ok: true } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await testAasRepositoryConnection(
      "https://c1.api.wago.com/smartdata-aas-env"
    );

    expect(result).toEqual({ status: "reachable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("trims the base URL before building the request", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://c1.api.wago.com/smartdata-aas-env/shells?limit=1");
      return { ok: true } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    await testAasRepositoryConnection("  https://c1.api.wago.com/smartdata-aas-env  ");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once after a delay and succeeds once the second attempt gets a response at all", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = testAasRepositoryConnection("https://example.com");
    await vi.advanceTimersByTimeAsync(1500);
    const result = await resultPromise;

    expect(result).toEqual({ status: "reachable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns reachable even when the response is a non-2xx status - a real server answered", async () => {
    // Confirmed live: R. STAHL's AAS API only supports direct-by-id shell
    // lookups, not this generic listing call, and genuinely 404s here even
    // though the repository is fully reachable and working. A completed
    // HTTP response - any status - means there's a real server there.
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await testAasRepositoryConnection("https://api.dt.r-stahl.com/api/v1.0");

    expect(result).toEqual({ status: "reachable" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns unreachable when both attempts throw (network error or timeout)", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = testAasRepositoryConnection("https://example.com");
    await vi.advanceTimersByTimeAsync(1500);
    const result = await resultPromise;

    expect(result).toEqual({ status: "unreachable" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
