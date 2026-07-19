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
      data: {
        name: "Laptop",
        description: "Work",
        structureNodeId: null,
        aasEndpointUrl: null,
        aasGlobalAssetId: null,
        assetImage: null,
        assetImageType: null,
        nameplateImage: null,
        nameplateImageType: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("creates the asset with uploaded photos", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["asset-bytes"], "asset.jpg", { type: "image/jpeg" })
    );
    formData.set(
      "nameplateImage",
      new File(["nameplate-bytes"], "nameplate.png", { type: "image/png" })
    );

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({ error: null });
    const [{ data }] = prisma.asset.create.mock.calls[0];
    expect(Buffer.from(data.assetImage).toString()).toBe("asset-bytes");
    expect(data.assetImageType).toBe("image/jpeg");
    expect(Buffer.from(data.nameplateImage).toString()).toBe("nameplate-bytes");
    expect(data.nameplateImageType).toBe("image/png");
  });

  it("returns an error and does not persist on invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.asset.create).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns an error and does not persist when a photo has an invalid type", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["doc-bytes"], "doc.pdf", { type: "application/pdf" })
    );

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({
      error: "Asset photo must be a JPEG, PNG, or WEBP image.",
    });
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

  it("rethrows unexpected errors raised while reading a photo", async () => {
    const arrayBufferSpy = vi
      .spyOn(File.prototype, "arrayBuffer")
      .mockRejectedValueOnce(new Error("disk read failed"));
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["asset-bytes"], "asset.jpg", { type: "image/jpeg" })
    );

    await expect(createAsset({ error: null }, formData)).rejects.toThrow(
      "disk read failed"
    );
    expect(prisma.asset.create).not.toHaveBeenCalled();

    arrayBufferSpy.mockRestore();
  });
});

describe("updateAsset", () => {
  it("updates the asset and revalidates on valid input", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    const result = await updateAsset("asset-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: {
        name: "Laptop",
        description: "Work",
        structureNodeId: null,
        aasEndpointUrl: null,
        aasGlobalAssetId: null,
      },
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

  it("leaves image fields untouched when no photo and no removal flag are sent", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    await updateAsset("asset-1", { error: null }, formData);

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: {
        name: "Laptop",
        description: "Work",
        structureNodeId: null,
        aasEndpointUrl: null,
        aasGlobalAssetId: null,
      },
    });
  });

  it("replaces the asset photo when a new file is uploaded", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["new-bytes"], "new.jpg", { type: "image/jpeg" })
    );

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(Buffer.from(data.assetImage).toString()).toBe("new-bytes");
    expect(data.assetImageType).toBe("image/jpeg");
  });

  it("clears the asset photo when the removal flag is sent without a new file", async () => {
    const formData = formDataWith({
      name: "Laptop",
      description: "Work",
      assetImageRemoved: "true",
    });

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.assetImage).toBeNull();
    expect(data.assetImageType).toBeNull();
  });

  it("replaces the nameplate photo when a new file is uploaded", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "nameplateImage",
      new File(["new-bytes"], "new.png", { type: "image/png" })
    );

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(Buffer.from(data.nameplateImage).toString()).toBe("new-bytes");
    expect(data.nameplateImageType).toBe("image/png");
  });

  it("clears the nameplate photo when the removal flag is sent without a new file", async () => {
    const formData = formDataWith({
      name: "Laptop",
      description: "Work",
      nameplateImageRemoved: "true",
    });

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.nameplateImage).toBeNull();
    expect(data.nameplateImageType).toBeNull();
  });

  it("returns an error and does not persist when a photo has an invalid type", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["doc-bytes"], "doc.pdf", { type: "application/pdf" })
    );

    const result = await updateAsset("asset-1", { error: null }, formData);

    expect(result).toEqual({
      error: "Asset photo must be a JPEG, PNG, or WEBP image.",
    });
    expect(prisma.asset.update).not.toHaveBeenCalled();
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

  it("rethrows unexpected errors raised while reading a photo", async () => {
    const arrayBufferSpy = vi
      .spyOn(File.prototype, "arrayBuffer")
      .mockRejectedValueOnce(new Error("disk read failed"));
    const formData = formDataWith({ name: "Laptop", description: "Work" });
    formData.set(
      "assetImage",
      new File(["asset-bytes"], "asset.jpg", { type: "image/jpeg" })
    );

    await expect(
      updateAsset("asset-1", { error: null }, formData)
    ).rejects.toThrow("disk read failed");
    expect(prisma.asset.update).not.toHaveBeenCalled();

    arrayBufferSpy.mockRestore();
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
