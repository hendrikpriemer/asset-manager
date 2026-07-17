import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStructureLevel } from "@/generated/prisma/client";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assetStructureNode: {
      create: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));

const {
  createAssetStructureRoot,
  createStructureNode,
  updateStructureNode,
  deleteStructureNode,
  moveStructureNodeUp,
  moveStructureNodeDown,
} = await import("./asset-structure-actions");

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

describe("createAssetStructureRoot", () => {
  it("creates the Enterprise root when none exists", async () => {
    prisma.assetStructureNode.findFirst.mockResolvedValue(null);
    const formData = formDataWith({ name: "Acme", description: "HQ" });

    const result = await createAssetStructureRoot({ error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.assetStructureNode.create).toHaveBeenCalledWith({
      data: {
        name: "Acme",
        description: "HQ",
        level: AssetStructureLevel.ENTERPRISE,
        position: 0,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("returns an error and does not create when a root already exists", async () => {
    prisma.assetStructureNode.findFirst.mockResolvedValue({ id: "existing" });
    const formData = formDataWith({ name: "Acme" });

    const result = await createAssetStructureRoot({ error: null }, formData);

    expect(result).toEqual({ error: "An asset structure already exists." });
    expect(prisma.assetStructureNode.create).not.toHaveBeenCalled();
  });

  it("returns a validation error without checking for an existing root", async () => {
    const formData = formDataWith({ name: "" });

    const result = await createAssetStructureRoot({ error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.assetStructureNode.findFirst).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(
      createAssetStructureRoot({ error: null }, formData)
    ).rejects.toThrow("boom");
  });
});

describe("createStructureNode", () => {
  it("creates a child node at the next sibling position", async () => {
    prisma.assetStructureNode.count.mockResolvedValue(2);
    const formData = formDataWith({ level: "SITE", name: "Laatzen" });

    const result = await createStructureNode("root", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.assetStructureNode.count).toHaveBeenCalledWith({
      where: { parentId: "root" },
    });
    expect(prisma.assetStructureNode.create).toHaveBeenCalledWith({
      data: {
        name: "Laatzen",
        description: null,
        level: AssetStructureLevel.SITE,
        parentId: "root",
        position: 2,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("returns an error for an invalid level", async () => {
    const formData = formDataWith({ level: "ENTERPRISE", name: "Acme" });

    const result = await createStructureNode("root", { error: null }, formData);

    expect(result).toEqual({ error: "Invalid level." });
    expect(prisma.assetStructureNode.create).not.toHaveBeenCalled();
  });

  it("returns an error for invalid name input", async () => {
    const formData = formDataWith({ level: "SITE", name: "" });

    const result = await createStructureNode("root", { error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.assetStructureNode.create).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(
      createStructureNode("root", { error: null }, formData)
    ).rejects.toThrow("boom");
  });
});

describe("updateStructureNode", () => {
  it("updates the node's name and description", async () => {
    const formData = formDataWith({ name: "Renamed", description: "New desc" });

    const result = await updateStructureNode("node-1", { error: null }, formData);

    expect(result).toEqual({ error: null });
    expect(prisma.assetStructureNode.update).toHaveBeenCalledWith({
      where: { id: "node-1" },
      data: { name: "Renamed", description: "New desc" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("returns an error for invalid input", async () => {
    const formData = formDataWith({ name: "" });

    const result = await updateStructureNode("node-1", { error: null }, formData);

    expect(result).toEqual({ error: "Name is required." });
    expect(prisma.assetStructureNode.update).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(
      updateStructureNode("node-1", { error: null }, formData)
    ).rejects.toThrow("boom");
  });
});

describe("deleteStructureNode", () => {
  it("deletes the node and revalidates both the structure and assets pages", async () => {
    await deleteStructureNode("node-1");

    expect(prisma.assetStructureNode.delete).toHaveBeenCalledWith({
      where: { id: "node-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
  });
});

describe("moveStructureNodeUp / moveStructureNodeDown", () => {
  it("does nothing when the node does not exist", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue(null);

    await moveStructureNodeUp("missing");

    expect(prisma.assetStructureNode.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when moving the first sibling up", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({
      id: "a",
      parentId: "root",
      position: 0,
    });
    prisma.assetStructureNode.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);

    await moveStructureNodeUp("a");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does nothing when moving the last sibling down", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({
      id: "b",
      parentId: "root",
      position: 1,
    });
    prisma.assetStructureNode.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);

    await moveStructureNodeDown("b");

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("swaps positions with the previous sibling when moving up", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({
      id: "b",
      parentId: "root",
      position: 1,
    });
    prisma.assetStructureNode.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);
    prisma.assetStructureNode.update.mockReturnValue("update-op");

    await moveStructureNodeUp("b");

    expect(prisma.assetStructureNode.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { position: 0 },
    });
    expect(prisma.assetStructureNode.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { position: 1 },
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(["update-op", "update-op"]);
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("swaps positions with the next sibling when moving down", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({
      id: "a",
      parentId: "root",
      position: 0,
    });
    prisma.assetStructureNode.findMany.mockResolvedValue([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ]);

    await moveStructureNodeDown("a");

    expect(prisma.assetStructureNode.update).toHaveBeenCalledWith({
      where: { id: "a" },
      data: { position: 1 },
    });
    expect(prisma.assetStructureNode.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { position: 0 },
    });
  });
});
