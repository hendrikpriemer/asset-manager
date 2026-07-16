import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Asset, AssetStructureLevel } from "@/generated/prisma/client";

export type StructureNodeAsset = { id: string; name: string };

type RawStructureNode = {
  id: string;
  level: AssetStructureLevel;
  name: string;
  description: string | null;
  position: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assets: StructureNodeAsset[];
};

export type StructureTreeNode = {
  id: string;
  level: AssetStructureLevel;
  name: string;
  description: string | null;
  position: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assetCount: number;
  assets: StructureNodeAsset[];
  children: StructureTreeNode[];
};

export type StructureOption = { id: string; label: string };

export type FlattenedStructureRow = {
  id: string;
  name: string;
  level: AssetStructureLevel;
  description: string | null;
  path: string;
  assetCount: number;
  updatedAt: Date;
};

export function buildStructureTree(
  nodes: RawStructureNode[]
): StructureTreeNode | null {
  const byParent = new Map<string | null, RawStructureNode[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  function toTreeNode(node: RawStructureNode): StructureTreeNode {
    const children = (byParent.get(node.id) ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toTreeNode);
    return { ...node, assetCount: node.assets.length, children };
  }

  const roots = (byParent.get(null) ?? []).sort(
    (a, b) => a.position - b.position
  );
  return roots[0] ? toTreeNode(roots[0]) : null;
}

export async function getAssetStructureTree(): Promise<StructureTreeNode | null> {
  const nodes = await prisma.assetStructureNode.findMany({
    include: { assets: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
  });
  return buildStructureTree(nodes);
}

export function getStructureNode(id: string) {
  return prisma.assetStructureNode.findUnique({ where: { id } });
}

export async function getStructureNodeByIdOrNotFound(id: string) {
  const node = await getStructureNode(id);
  if (!node) {
    notFound();
  }
  return node;
}

export function getStructureRoot() {
  return prisma.assetStructureNode.findFirst({ where: { parentId: null } });
}

export function getNodeBreadcrumb(
  nodeId: string,
  nodesById: Map<string, { name: string; parentId: string | null }>
): string[] {
  const path: string[] = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: { name: string; parentId: string | null } | undefined =
      nodesById.get(currentId);
    if (!node) break;
    path.push(node.name);
    currentId = node.parentId;
  }
  return path.reverse();
}

export function flattenAssetStructure(
  tree: StructureTreeNode | null
): FlattenedStructureRow[] {
  if (!tree) return [];
  const rows: FlattenedStructureRow[] = [];

  function walk(node: StructureTreeNode, ancestorNames: string[]) {
    rows.push({
      id: node.id,
      name: node.name,
      level: node.level,
      description: node.description,
      path: ancestorNames.join(" / "),
      assetCount: node.assetCount,
      updatedAt: node.updatedAt,
    });
    for (const child of node.children) {
      walk(child, [...ancestorNames, node.name]);
    }
  }

  walk(tree, []);
  return rows;
}

export function flattenStructureOptions(
  tree: StructureTreeNode | null
): StructureOption[] {
  if (!tree) return [];
  const options: StructureOption[] = [];

  function walk(node: StructureTreeNode, ancestorNames: string[]) {
    options.push({ id: node.id, label: [...ancestorNames, node.name].join(" / ") });
    for (const child of node.children) {
      walk(child, [...ancestorNames, node.name]);
    }
  }

  walk(tree, []);
  return options;
}

export async function getFlattenedStructureOptions(): Promise<
  StructureOption[]
> {
  const tree = await getAssetStructureTree();
  return flattenStructureOptions(tree);
}

export type AssetWithStructurePath = Asset & { structurePath: string | null };

export async function getAssetsWithStructurePath(): Promise<
  AssetWithStructurePath[]
> {
  const [assets, nodes] = await Promise.all([
    prisma.asset.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.assetStructureNode.findMany({
      select: { id: true, name: true, parentId: true },
    }),
  ]);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return assets.map((asset) => ({
    ...asset,
    structurePath: asset.structureNodeId
      ? getNodeBreadcrumb(asset.structureNodeId, nodesById).join(" / ")
      : null,
  }));
}
