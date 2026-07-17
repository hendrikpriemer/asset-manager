import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const { prisma } = vi.hoisted(() => ({
  prisma: {
    asset: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { createAsset, updateAsset, deleteAsset } = await import("./actions");

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

describe("createAsset", () => {
  it("creates the asset and revalidates on valid input", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: { name: "Laptop", description: "Work", structureNodeId: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("returns an error and does not persist on invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.asset.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of swallowing them", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(createAsset({ error: null }, formData)).rejects.toThrow(
      "boom"
    );
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });
});

describe("updateAsset", () => {
  it("updates the asset and revalidates on valid input", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    const result = await updateAsset("asset-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: { name: "Laptop", description: "Work", structureNodeId: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("returns an error and does not persist on invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await updateAsset("asset-1", { error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.asset.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of swallowing them", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(
      updateAsset("asset-1", { error: null }, formData)
    ).rejects.toThrow("boom");
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });
});

describe("deleteAsset", () => {
  it("deletes the asset and revalidates the list", async () => {
    await deleteAsset("asset-1");

    expect(prisma.asset.delete).toHaveBeenCalledWith({
      where: { id: "asset-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });
});
