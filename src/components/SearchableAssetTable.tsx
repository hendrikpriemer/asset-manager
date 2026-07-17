"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterAssetsWithStructurePath } from "@/lib/asset-search";
import type { AssetWithStructurePath } from "@/lib/asset-structure";
import { AssetTable } from "@/components/AssetTable";
import { Icon } from "@/components/Icon";
import { Tooltip } from "@/components/Tooltip";

export function SearchableAssetTable({
  assets,
}: {
  assets: AssetWithStructurePath[];
}) {
  const [query, setQuery] = useState("");
  const filteredAssets = useMemo(
    () => filterAssetsWithStructurePath(assets, query),
    [assets, query]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets"
            aria-label="Search assets"
            className="w-full rounded-full border border-outline bg-surface py-2 pr-3 pl-9 md-body-large text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
        <Tooltip label="New Asset">
          <Link
            href="/assets/new"
            aria-label="New Asset"
            className="flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-on-primary lg:px-6"
          >
            <Icon name="add" />
            <span className="hidden md-label-large lg:inline">New Asset</span>
          </Link>
        </Tooltip>
      </div>
      {assets.length > 0 && filteredAssets.length === 0 ? (
        <p className="md-body-large text-on-surface-variant">
          No assets match your search.
        </p>
      ) : (
        <AssetTable assets={filteredAssets} />
      )}
    </div>
  );
}
