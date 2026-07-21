import type {
  AssetWithStructurePath,
  StructureTreeNode,
} from "@/lib/asset-structure";

function textIncludes(text: string | null | undefined, query: string): boolean {
  return text != null && text.toLowerCase().includes(query);
}

export function assetMatchesSearch(
  asset: {
    name: string;
    description: string | null;
    aasSearchText?: string | null;
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    textIncludes(asset.name, q) ||
    textIncludes(asset.description, q) ||
    textIncludes(asset.aasSearchText, q)
  );
}

/**
 * Filters a structure tree down to nodes that match the query by name or
 * description, or that have a matching descendant node or asset. If an
 * ancestor node itself matches, its whole subtree is kept as-is so the match
 * stays in context. Returns null when nothing in the tree matches.
 */
export function filterStructureTree(
  node: StructureTreeNode,
  query: string
): StructureTreeNode | null {
  const q = query.trim().toLowerCase();
  if (!q) return node;

  const selfMatches = textIncludes(node.name, q) || textIncludes(node.description, q);
  if (selfMatches) return node;

  const filteredChildren = node.children
    .map((child) => filterStructureTree(child, query))
    .filter((child): child is StructureTreeNode => child !== null);
  const matchingAssets = node.assets.filter((asset) =>
    assetMatchesSearch(asset, query)
  );

  if (filteredChildren.length === 0 && matchingAssets.length === 0) {
    return null;
  }

  return { ...node, children: filteredChildren, assets: matchingAssets };
}

export function filterAssetsWithStructurePath(
  assets: AssetWithStructurePath[],
  query: string
): AssetWithStructurePath[] {
  const q = query.trim().toLowerCase();
  if (!q) return assets;
  return assets.filter(
    (asset) =>
      textIncludes(asset.name, q) ||
      textIncludes(asset.description, q) ||
      textIncludes(asset.structurePath, q) ||
      textIncludes(asset.aasSearchText, q)
  );
}
