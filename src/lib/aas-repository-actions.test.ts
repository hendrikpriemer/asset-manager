import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

const { prisma } = vi.hoisted(() => ({
  prisma: {
    aasRepository: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { createAasRepository, deleteAasRepository } = await import(
  "./aas-repository-actions"
);

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

describe("deleteAasRepository", () => {
  it("deletes the repository and revalidates the settings page", async () => {
    await deleteAasRepository("repo-1");

    expect(prisma.aasRepository.delete).toHaveBeenCalledWith({
      where: { id: "repo-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/aas-repositories");
  });
});
