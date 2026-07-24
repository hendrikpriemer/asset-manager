import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const { prisma } = vi.hoisted(() => ({
  prisma: {
    asset: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));
const { reindexAssetAas } = vi.hoisted(() => ({ reindexAssetAas: vi.fn() }));
const { publishAssetAas, unpublishAssetAas } = vi.hoisted(() => ({
  publishAssetAas: vi.fn(),
  unpublishAssetAas: vi.fn(),
}));
const { resolveAasReference } = vi.hoisted(() => ({ resolveAasReference: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/aas-reindex", () => ({ reindexAssetAas }));
vi.mock("@/lib/aas-publish", () => ({ publishAssetAas, unpublishAssetAas }));
vi.mock("@/lib/aas-actions", () => ({ resolveAasReference }));

const { createAsset, updateAsset, deleteAsset, refreshAasSearchIndex } =
  await import("./actions");

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

const createdAsset = { id: "asset-1", name: "Laptop" };

beforeEach(() => {
  vi.clearAllMocks();
  reindexAssetAas.mockResolvedValue({ status: "no-reference" });
  prisma.asset.create.mockResolvedValue(createdAsset);
  prisma.asset.update.mockResolvedValue(createdAsset);
  publishAssetAas.mockResolvedValue("published");
  unpublishAssetAas.mockResolvedValue(undefined);
  // No repository-search correction by default - the classified reference
  // is used as-is, matching every existing test's expectations.
  resolveAasReference.mockResolvedValue(null);
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
        aasSearchText: null,
        aasSearchIndexedAt: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("publishes the created asset as its own AAS in the local mirror", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    await createAsset({ error: null }, formData);

    expect(publishAssetAas).toHaveBeenCalledWith(createdAsset);
  });

  it("still succeeds when publishing the asset's own AAS fails", async () => {
    publishAssetAas.mockResolvedValue("publish-failed");
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    const result = await createAsset({ error: null }, formData);

    expect(result).toEqual({ error: null });
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

  it("stores the AAS search index when reindexing succeeds", async () => {
    reindexAssetAas.mockResolvedValue({ status: "ok", text: "acme lathe", mirror: "mirrored" });
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "https://vendor.example/assets/lathe-1",
    });

    await createAsset({ error: null }, formData);

    const [{ data }] = prisma.asset.create.mock.calls[0];
    expect(data.aasSearchText).toBe("acme lathe");
    expect(data.aasSearchIndexedAt).toBeInstanceOf(Date);
  });

  it("omits the search index fields (defaulting to unset) when reindexing fails", async () => {
    reindexAssetAas.mockResolvedValue({ status: "failed" });
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "https://vendor.example/assets/lathe-1",
    });

    await createAsset({ error: null }, formData);

    const [{ data }] = prisma.asset.create.mock.calls[0];
    expect(data.aasSearchText).toBeUndefined();
    expect(data.aasSearchIndexedAt).toBeUndefined();
  });

  it("persists the resolved globalAssetId when a bare material/serial number is corrected via repository search", async () => {
    resolveAasReference.mockResolvedValue({
      reference: {
        aasEndpointUrl: null,
        aasGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      },
      idShort: "x",
    });
    const formData = formDataWith({
      name: "Remote I/O module",
      description: "Zone 1",
      aasReference: "10003506595",
    });

    await createAsset({ error: null }, formData);

    expect(resolveAasReference).toHaveBeenCalledWith(
      { aasGlobalAssetId: "10003506595" },
      "10003506595"
    );
    const [{ data }] = prisma.asset.create.mock.calls[0];
    expect(data.aasGlobalAssetId).toBe("https://dt.r-stahl.com/aas/instance/10003506595");
    expect(reindexAssetAas).toHaveBeenCalledWith({
      aasEndpointUrl: null,
      aasGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
    });
  });

  it("does not attempt the repository search when no AAS reference was entered", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    await createAsset({ error: null }, formData);

    expect(resolveAasReference).not.toHaveBeenCalled();
  });

  it("does not attempt the repository search when an endpoint URL was entered", async () => {
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "https://vendor.example/shells/lathe-1",
    });

    await createAsset({ error: null }, formData);

    expect(resolveAasReference).not.toHaveBeenCalled();
  });

  it("defaults the resolved reference's fields to null when unset", async () => {
    resolveAasReference.mockResolvedValue({ reference: {}, idShort: "x" });
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "10003506595",
    });

    await createAsset({ error: null }, formData);

    const [{ data }] = prisma.asset.create.mock.calls[0];
    expect(data.aasEndpointUrl).toBeNull();
    expect(data.aasGlobalAssetId).toBeNull();
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
        aasSearchText: null,
        aasSearchIndexedAt: null,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("publishes the updated asset as its own AAS in the local mirror", async () => {
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    await updateAsset("asset-1", { error: null }, formData);

    expect(publishAssetAas).toHaveBeenCalledWith(createdAsset);
  });

  it("still succeeds when publishing the asset's own AAS fails", async () => {
    publishAssetAas.mockResolvedValue("publish-failed");
    const formData = formDataWith({ name: "Laptop", description: "Work" });

    const result = await updateAsset("asset-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
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
        aasSearchText: null,
        aasSearchIndexedAt: null,
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

  it("refreshes the AAS search index when reindexing succeeds", async () => {
    reindexAssetAas.mockResolvedValue({ status: "ok", text: "acme lathe", mirror: "mirrored" });
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "https://vendor.example/assets/lathe-1",
    });

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.aasSearchText).toBe("acme lathe");
    expect(data.aasSearchIndexedAt).toBeInstanceOf(Date);
  });

  it("clears the AAS search index when the reference is removed", async () => {
    reindexAssetAas.mockResolvedValue({ status: "no-reference" });
    const formData = formDataWith({ name: "Lathe", description: "Main lathe" });

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.aasSearchText).toBeNull();
    expect(data.aasSearchIndexedAt).toBeNull();
  });

  it("leaves the existing AAS search index untouched when reindexing fails", async () => {
    reindexAssetAas.mockResolvedValue({ status: "failed" });
    const formData = formDataWith({
      name: "Lathe",
      description: "Main lathe",
      aasReference: "https://vendor.example/assets/lathe-1",
    });

    await updateAsset("asset-1", { error: null }, formData);

    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.aasSearchText).toBeUndefined();
    expect(data.aasSearchIndexedAt).toBeUndefined();
  });

  it("persists the resolved globalAssetId when a bare material/serial number is corrected via repository search", async () => {
    resolveAasReference.mockResolvedValue({
      reference: {
        aasEndpointUrl: null,
        aasGlobalAssetId: "https://dt.r-stahl.com/aas/instance/10003506595",
      },
      idShort: "x",
    });
    const formData = formDataWith({
      name: "Remote I/O module",
      description: "Zone 1",
      aasReference: "10003506595",
    });

    await updateAsset("asset-1", { error: null }, formData);

    expect(resolveAasReference).toHaveBeenCalledWith(
      { aasGlobalAssetId: "10003506595" },
      "10003506595"
    );
    const [{ data }] = prisma.asset.update.mock.calls[0];
    expect(data.aasGlobalAssetId).toBe("https://dt.r-stahl.com/aas/instance/10003506595");
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

  it("unpublishes the asset's own AAS from the local mirror", async () => {
    await deleteAsset("asset-1");

    expect(unpublishAssetAas).toHaveBeenCalledWith("asset-1");
  });
});

describe("refreshAasSearchIndex", () => {
  it("returns an error when the asset doesn't exist", async () => {
    prisma.asset.findUnique.mockResolvedValue(null);

    const result = await refreshAasSearchIndex("missing-asset");

    expect(result).toEqual({ error: "Asset not found.", mirrorWarning: null });
    expect(reindexAssetAas).not.toHaveBeenCalled();
  });

  it("returns an error when the asset has no AAS reference", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
    });
    reindexAssetAas.mockResolvedValue({ status: "no-reference" });

    const result = await refreshAasSearchIndex("asset-1");

    expect(result).toEqual({
      error: "This asset has no AAS reference to index.",
      mirrorWarning: null,
    });
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it("returns an error without touching the existing index when the AAS repository can't be reached", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      aasEndpointUrl: "https://vendor.example/shells/abc",
      aasGlobalAssetId: null,
    });
    reindexAssetAas.mockResolvedValue({ status: "failed" });

    const result = await refreshAasSearchIndex("asset-1");

    expect(result).toEqual({
      error: "Could not reach the configured AAS repository.",
      mirrorWarning: null,
    });
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it("returns an error without touching the existing index when the AAS fetch was incomplete", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      aasEndpointUrl: "https://vendor.example/shells/abc",
      aasGlobalAssetId: null,
    });
    reindexAssetAas.mockResolvedValue({ status: "incomplete" });

    const result = await refreshAasSearchIndex("asset-1");

    expect(result).toEqual({
      error:
        "Some parts of this asset's AAS data could not be retrieved - the search index and mirror were not updated.",
      mirrorWarning: null,
    });
    expect(prisma.asset.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("updates the search index and reports success when the mirror also succeeds", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      aasEndpointUrl: "https://vendor.example/shells/abc",
      aasGlobalAssetId: null,
    });
    reindexAssetAas.mockResolvedValue({ status: "ok", text: "acme lathe", mirror: "mirrored" });

    const result = await refreshAasSearchIndex("asset-1");

    expect(result).toEqual({ error: null, mirrorWarning: null });
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: { aasSearchText: "acme lathe", aasSearchIndexedAt: expect.any(Date) },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("succeeds but reports a mirror warning when mirroring fails", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      aasEndpointUrl: "https://vendor.example/shells/abc",
      aasGlobalAssetId: null,
    });
    reindexAssetAas.mockResolvedValue({
      status: "ok",
      text: "acme lathe",
      mirror: "mirror-failed",
    });

    const result = await refreshAasSearchIndex("asset-1");

    expect(result).toEqual({
      error: null,
      mirrorWarning: "Search index updated, but mirroring to the local AAS repository failed.",
    });
  });
});
