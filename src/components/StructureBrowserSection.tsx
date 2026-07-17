"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { StructureNodeAsset, StructureTreeNode } from "@/lib/asset-structure";
import { Icon } from "@/components/Icon";
import { StructureNavTree } from "@/components/StructureNavTree";
import { Tooltip } from "@/components/Tooltip";

// Kept in sync so the tree column below is always exactly as wide as the
// search field above it. Wide enough for the search field's placeholder
// text to be fully readable.
const TREE_COLUMN_WIDTH = "w-80";

export function StructureBrowserSection({
  tree,
  unassignedAssets,
  detail,
}: {
  tree: StructureTreeNode;
  unassignedAssets: StructureNodeAsset[];
  detail: ReactNode;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className={`relative ${TREE_COLUMN_WIDTH}`}>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search structure and assets"
            aria-label="Search asset structure"
            className="w-full rounded-full border border-outline bg-surface py-2 pr-3 pl-9 md-body-large text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <Tooltip label="Edit Asset Structure">
          <Link
            href="/asset-structure/edit"
            aria-label="Edit Asset Structure"
            className="flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-on-primary lg:px-6"
          >
            <Icon name="edit" />
            <span className="hidden md-label-large lg:inline">
              Edit Asset Structure
            </span>
          </Link>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 gap-8">
        <div
          className={`min-h-0 ${TREE_COLUMN_WIDTH} shrink-0 overflow-auto border-r border-outline-variant pr-4`}
        >
          <StructureNavTree
            tree={tree}
            unassignedAssets={unassignedAssets}
            query={query}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{detail}</div>
      </div>
    </div>
  );
}
