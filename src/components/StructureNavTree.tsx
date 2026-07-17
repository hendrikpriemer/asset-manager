"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { assetMatchesSearch, filterStructureTree } from "@/lib/asset-search";
import type {
  StructureNodeAsset,
  StructureTreeNode,
} from "@/lib/asset-structure";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

const UNASSIGNED_BUCKET_ID = "unassigned";

function collectAllIds(node: StructureTreeNode): string[] {
  return [node.id, ...node.children.flatMap(collectAllIds)];
}

function AssetLeafLink({ asset }: { asset: StructureNodeAsset }) {
  const pathname = usePathname();
  const href = `/asset-structure/asset/${asset.id}`;
  const isActive = pathname === href;

  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 md-label-large ${
          isActive
            ? "bg-secondary-container text-on-secondary-container"
            : "text-on-surface-variant hover:bg-on-surface/8"
        }`}
      >
        <Icon name="inventory_2" />
        {asset.name}
      </Link>
    </li>
  );
}

function StructureNavTreeNode({
  node,
  expandedIds,
  onToggleExpand,
  forceExpanded,
}: {
  node: StructureTreeNode;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  forceExpanded: boolean;
}) {
  const pathname = usePathname();
  const href = `/asset-structure/${node.id}`;
  const isActive = pathname === href;
  const hasNestedItems = node.children.length > 0 || node.assets.length > 0;
  const expanded = forceExpanded || expandedIds.has(node.id);

  return (
    <li>
      <div className="flex items-center gap-1">
        {hasNestedItems ? (
          <Button
            variant="icon"
            onClick={() => onToggleExpand(node.id)}
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="p-1"
          >
            <Icon name={expanded ? "expand_more" : "chevron_right"} />
          </Button>
        ) : (
          <span className="w-8" aria-hidden="true" />
        )}
        <Link
          href={href}
          aria-current={isActive ? "page" : undefined}
          className={`block flex-1 whitespace-nowrap rounded-full px-3 py-1.5 md-label-large ${
            isActive
              ? "bg-secondary-container text-on-secondary-container"
              : "text-on-surface-variant hover:bg-on-surface/8"
          }`}
        >
          {node.name}
        </Link>
      </div>
      {expanded && hasNestedItems && (
        <ul className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-2">
          {node.children.map((child) => (
            <StructureNavTreeNode
              key={child.id}
              node={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              forceExpanded={forceExpanded}
            />
          ))}
          {node.assets.map((asset) => (
            <AssetLeafLink key={asset.id} asset={asset} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function StructureNavTree({
  tree,
  unassignedAssets,
  query,
}: {
  tree: StructureTreeNode;
  unassignedAssets: StructureNodeAsset[];
  query: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set([...collectAllIds(tree), UNASSIGNED_BUCKET_ID])
  );

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const isSearching = query.trim().length > 0;
  const filteredTree = useMemo(
    () => filterStructureTree(tree, query),
    [tree, query]
  );
  const filteredUnassignedAssets = useMemo(
    () => unassignedAssets.filter((asset) => assetMatchesSearch(asset, query)),
    [unassignedAssets, query]
  );

  const visibleUnassignedAssets = isSearching
    ? filteredUnassignedAssets
    : unassignedAssets;
  const hasUnassignedAssets = visibleUnassignedAssets.length > 0;
  const unassignedExpanded = isSearching || expandedIds.has(UNASSIGNED_BUCKET_ID);
  const noResults = isSearching && !filteredTree && !hasUnassignedAssets;

  return (
    <nav aria-label="Asset structure">
      {noResults ? (
        <p className="px-3 py-2 md-body-medium text-on-surface-variant">
          No matches found.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {filteredTree && (
            <StructureNavTreeNode
              node={filteredTree}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              forceExpanded={isSearching}
            />
          )}
          <li>
            <div className="flex items-center gap-1">
              {hasUnassignedAssets ? (
                <Button
                  variant="icon"
                  onClick={() => toggleExpand(UNASSIGNED_BUCKET_ID)}
                  aria-label={
                    unassignedExpanded
                      ? "Collapse Unassigned Assets"
                      : "Expand Unassigned Assets"
                  }
                  className="p-1"
                >
                  <Icon name={unassignedExpanded ? "expand_more" : "chevron_right"} />
                </Button>
              ) : (
                <span className="w-8" aria-hidden="true" />
              )}
              <span className="block flex-1 whitespace-nowrap rounded-full px-3 py-1.5 md-label-large text-on-surface-variant">
                Unassigned Assets
              </span>
            </div>
            {unassignedExpanded && hasUnassignedAssets && (
              <ul className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-2">
                {visibleUnassignedAssets.map((asset) => (
                  <AssetLeafLink key={asset.id} asset={asset} />
                ))}
              </ul>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
