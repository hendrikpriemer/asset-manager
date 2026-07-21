import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Asset, AssetStructureLevel } from "@/generated/prisma/client";

export type StructureNodeAsset = {
  id: string;
  name: string;
  description: string | null;
  aasSearchText: string | null;
};

type RawStructureNode = {
  id: string;
  level: AssetStructureLevel;
  name: string;
  description: string | null;
  address: string | null;
  timezone: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
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
  address: string | null;
  timezone: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  position: number;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  assetCount: number;
  assets: StructureNodeAsset[];
  children: StructureTreeNode[];
};

export type StructureOption = { id: string; label: string };

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

/**
 * Wrapped in React's request-scoped `cache()` since both the asset-structure
 * browse layout and its root page fetch the tree independently (Next.js
 * layouts can't pass data to pages via props) - this dedupes the DB query
 * within a single request instead of running it twice.
 */
export const getAssetStructureTree = cache(
  async (): Promise<StructureTreeNode | null> => {
    const nodes = await prisma.assetStructureNode.findMany({
      include: {
        assets: {
          select: { id: true, name: true, description: true, aasSearchText: true },
          orderBy: { name: "asc" },
        },
      },
    });
    return buildStructureTree(nodes);
  }
);

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

export function getUnassignedAssets(): Promise<StructureNodeAsset[]> {
  return prisma.asset.findMany({
    where: { structureNodeId: null },
    select: { id: true, name: true, description: true, aasSearchText: true },
    orderBy: { name: "asc" },
  });
}

export type AssetWithStructurePath = Omit<
  Asset,
  "assetImage" | "nameplateImage"
> & {
  structurePath: string | null;
  structureLevel: AssetStructureLevel | null;
};

export async function getAssetsWithStructurePath(): Promise<
  AssetWithStructurePath[]
> {
  const [assets, nodes] = await Promise.all([
    prisma.asset.findMany({
      orderBy: { updatedAt: "desc" },
      omit: { assetImage: true, nameplateImage: true },
    }),
    prisma.assetStructureNode.findMany({
      select: { id: true, name: true, parentId: true, level: true },
    }),
  ]);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return assets.map((asset) => {
    const node = asset.structureNodeId
      ? nodesById.get(asset.structureNodeId)
      : undefined;
    return {
      ...asset,
      structurePath: asset.structureNodeId
        ? getNodeBreadcrumb(asset.structureNodeId, nodesById).join(" / ")
        : null,
      structureLevel: node?.level ?? null,
    };
  });
}
