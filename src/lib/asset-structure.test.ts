import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetStructureLevel } from "@/generated/prisma/client";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    assetStructureNode: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
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
  buildStructureTree,
  getAssetStructureTree,
  getStructureNode,
  getStructureNodeByIdOrNotFound,
  getStructureRoot,
  getNodeBreadcrumb,
  flattenAssetStructure,
  flattenStructureOptions,
  getFlattenedStructureOptions,
  getAssetsWithStructurePath,
} = await import("./asset-structure");

const now = new Date("2026-01-01T00:00:00.000Z");

function rawNode(overrides: Partial<Parameters<typeof buildStructureTree>[0][number]>) {
  return {
    id: "id",
    level: AssetStructureLevel.SITE,
    name: "Node",
    description: null,
    position: 0,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    _count: { assets: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildStructureTree", () => {
  it("returns null for an empty list", () => {
    expect(buildStructureTree([])).toBeNull();
  });

  it("returns null when there is no root (no node with parentId null)", () => {
    const nodes = [
      rawNode({ id: "a", parentId: "missing-parent" }),
    ];

    expect(buildStructureTree(nodes)).toBeNull();
  });

  it("builds a single-node tree with no children", () => {
    const nodes = [
      rawNode({
        id: "root",
        level: AssetStructureLevel.ENTERPRISE,
        name: "Acme",
        parentId: null,
        _count: { assets: 2 },
      }),
    ];

    const tree = buildStructureTree(nodes);

    expect(tree).toMatchObject({ id: "root", name: "Acme", assetCount: 2 });
    expect(tree?.children).toEqual([]);
  });

  it("nests children under their parent, sorted by position", () => {
    const nodes = [
      rawNode({ id: "root", level: AssetStructureLevel.ENTERPRISE, name: "Acme", parentId: null }),
      rawNode({ id: "b", name: "Second", parentId: "root", position: 1 }),
      rawNode({ id: "a", name: "First", parentId: "root", position: 0 }),
    ];

    const tree = buildStructureTree(nodes);

    expect(tree?.children.map((c) => c.name)).toEqual(["First", "Second"]);
  });

  it("supports arbitrarily deep, flexible nesting (level skipping)", () => {
    const nodes = [
      rawNode({ id: "root", level: AssetStructureLevel.ENTERPRISE, name: "Acme", parentId: null }),
      rawNode({ id: "eq1", level: AssetStructureLevel.EQUIPMENT, name: "CNC", parentId: "root" }),
      rawNode({ id: "eq2", level: AssetStructureLevel.EQUIPMENT, name: "Press", parentId: "eq1" }),
    ];

    const tree = buildStructureTree(nodes);

    expect(tree?.children[0].name).toBe("CNC");
    expect(tree?.children[0].children[0].name).toBe("Press");
  });

  it("uses the first root when multiple exist (defensive fallback)", () => {
    const nodes = [
      rawNode({ id: "a", name: "A", parentId: null, position: 0 }),
      rawNode({ id: "b", name: "B", parentId: null, position: 1 }),
    ];

    expect(buildStructureTree(nodes)?.id).toBe("a");
  });
});

describe("getAssetStructureTree", () => {
  it("fetches all nodes with asset counts and builds the tree", async () => {
    prisma.assetStructureNode.findMany.mockResolvedValue([
      rawNode({ id: "root", level: AssetStructureLevel.ENTERPRISE, name: "Acme", parentId: null }),
    ]);

    const tree = await getAssetStructureTree();

    expect(prisma.assetStructureNode.findMany).toHaveBeenCalledWith({
      include: { _count: { select: { assets: true } } },
    });
    expect(tree?.name).toBe("Acme");
  });

  it("returns null when the structure is empty", async () => {
    prisma.assetStructureNode.findMany.mockResolvedValue([]);

    expect(await getAssetStructureTree()).toBeNull();
  });
});

describe("getStructureNode", () => {
  it("queries a single node by id", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({ id: "1" });

    const result = await getStructureNode("1");

    expect(prisma.assetStructureNode.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
    });
    expect(result).toEqual({ id: "1" });
  });
});

describe("getStructureNodeByIdOrNotFound", () => {
  it("returns the node when found", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue({ id: "1" });

    expect(await getStructureNodeByIdOrNotFound("1")).toEqual({ id: "1" });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("calls notFound when the node does not exist", async () => {
    prisma.assetStructureNode.findUnique.mockResolvedValue(null);

    await expect(getStructureNodeByIdOrNotFound("missing")).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
    expect(notFound).toHaveBeenCalled();
  });
});

describe("getStructureRoot", () => {
  it("queries the node with no parent", async () => {
    prisma.assetStructureNode.findFirst.mockResolvedValue({ id: "root" });

    const result = await getStructureRoot();

    expect(prisma.assetStructureNode.findFirst).toHaveBeenCalledWith({
      where: { parentId: null },
    });
    expect(result).toEqual({ id: "root" });
  });
});

describe("getNodeBreadcrumb", () => {
  const nodesById = new Map([
    ["root", { name: "Acme", parentId: null }],
    ["site", { name: "Laatzen", parentId: "root" }],
    ["area", { name: "Manufacturing", parentId: "site" }],
  ]);

  it("returns the ancestor chain from root to the given node, inclusive", () => {
    expect(getNodeBreadcrumb("area", nodesById)).toEqual([
      "Acme",
      "Laatzen",
      "Manufacturing",
    ]);
  });

  it("returns a single-element path for a root node", () => {
    expect(getNodeBreadcrumb("root", nodesById)).toEqual(["Acme"]);
  });

  it("stops gracefully when a node is missing from the map", () => {
    expect(getNodeBreadcrumb("unknown", nodesById)).toEqual([]);
  });
});

describe("flattenAssetStructure", () => {
  it("returns an empty array for a null tree", () => {
    expect(flattenAssetStructure(null)).toEqual([]);
  });

  it("flattens a nested tree into rows with breadcrumb paths", () => {
    const tree = {
      id: "root",
      level: AssetStructureLevel.ENTERPRISE,
      name: "Acme",
      description: null,
      position: 0,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      assetCount: 0,
      children: [
        {
          id: "site",
          level: AssetStructureLevel.SITE,
          name: "Laatzen",
          description: "Main site",
          position: 0,
          parentId: "root",
          createdAt: now,
          updatedAt: now,
          assetCount: 3,
          children: [],
        },
      ],
    };

    const rows = flattenAssetStructure(tree);

    expect(rows).toEqual([
      {
        id: "root",
        name: "Acme",
        level: AssetStructureLevel.ENTERPRISE,
        description: null,
        path: "",
        assetCount: 0,
        updatedAt: now,
      },
      {
        id: "site",
        name: "Laatzen",
        level: AssetStructureLevel.SITE,
        description: "Main site",
        path: "Acme",
        assetCount: 3,
        updatedAt: now,
      },
    ]);
  });
});

describe("flattenStructureOptions", () => {
  it("returns an empty array for a null tree", () => {
    expect(flattenStructureOptions(null)).toEqual([]);
  });

  it("labels every node with its full breadcrumb including itself", () => {
    const tree = {
      id: "root",
      level: AssetStructureLevel.ENTERPRISE,
      name: "Acme",
      description: null,
      position: 0,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      assetCount: 0,
      children: [
        {
          id: "site",
          level: AssetStructureLevel.SITE,
          name: "Laatzen",
          description: null,
          position: 0,
          parentId: "root",
          createdAt: now,
          updatedAt: now,
          assetCount: 0,
          children: [],
        },
      ],
    };

    expect(flattenStructureOptions(tree)).toEqual([
      { id: "root", label: "Acme" },
      { id: "site", label: "Acme / Laatzen" },
    ]);
  });
});

describe("getFlattenedStructureOptions", () => {
  it("builds options from the current structure tree", async () => {
    prisma.assetStructureNode.findMany.mockResolvedValue([
      rawNode({ id: "root", level: AssetStructureLevel.ENTERPRISE, name: "Acme", parentId: null }),
    ]);

    expect(await getFlattenedStructureOptions()).toEqual([
      { id: "root", label: "Acme" },
    ]);
  });

  it("returns an empty array when there is no structure", async () => {
    prisma.assetStructureNode.findMany.mockResolvedValue([]);

    expect(await getFlattenedStructureOptions()).toEqual([]);
  });
});

describe("getAssetsWithStructurePath", () => {
  it("attaches a breadcrumb path to assigned assets and null to unassigned ones", async () => {
    prisma.asset.findMany.mockResolvedValue([
      { id: "a1", name: "Sensor", structureNodeId: "site" },
      { id: "a2", name: "Loose Sensor", structureNodeId: null },
    ]);
    prisma.assetStructureNode.findMany.mockResolvedValue([
      { id: "root", name: "Acme", parentId: null },
      { id: "site", name: "Laatzen", parentId: "root" },
    ]);

    const result = await getAssetsWithStructurePath();

    expect(result).toEqual([
      { id: "a1", name: "Sensor", structureNodeId: "site", structurePath: "Acme / Laatzen" },
      { id: "a2", name: "Loose Sensor", structureNodeId: null, structurePath: null },
    ]);
  });
});
