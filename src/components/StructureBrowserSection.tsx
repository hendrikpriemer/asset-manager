"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { StructureNodeAsset, StructureTreeNode } from "@/lib/asset-structure";
import { Icon } from "@/components/Icon";
import { StructureNavTree } from "@/components/StructureNavTree";
import { Tooltip } from "@/components/Tooltip";

const DEFAULT_TREE_WIDTH = 320;
const MIN_TREE_WIDTH = 200;
const MAX_TREE_WIDTH = 600;
const KEYBOARD_RESIZE_STEP = 16;
const TREE_WIDTH_STORAGE_KEY = "asset-structure:tree-width";

function clampTreeWidth(width: number): number {
  return Math.min(MAX_TREE_WIDTH, Math.max(MIN_TREE_WIDTH, width));
}

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
  const [treeWidth, setTreeWidth] = useState(DEFAULT_TREE_WIDTH);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(TREE_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      // localStorage isn't available during SSR, so the persisted width can only
      // be applied once mounted on the client - a one-time hydrate, not a subscription.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTreeWidth(clampTreeWidth(stored));
    }
  }, []);

  function updateTreeWidth(width: number) {
    const clamped = clampTreeWidth(width);
    setTreeWidth(clamped);
    window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, String(clamped));
  }

  function handleResizeStart(event: MouseEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = treeWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function handleMouseMove(moveEvent: globalThis.MouseEvent) {
      updateTreeWidth(startWidth + (moveEvent.clientX - startX));
    }
    function handleMouseUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleResizeKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowLeft") {
      updateTreeWidth(treeWidth - KEYBOARD_RESIZE_STEP);
    } else if (event.key === "ArrowRight") {
      updateTreeWidth(treeWidth + KEYBOARD_RESIZE_STEP);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="relative" style={{ width: treeWidth }}>
          <Icon
            name="search"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search structure, assets, and linked AAS data"
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
      <div className="flex min-h-0 flex-1">
        <div
          className="min-h-0 shrink-0 overflow-auto pr-4 md-scrollbar"
          style={{ width: treeWidth }}
        >
          <StructureNavTree
            tree={tree}
            unassignedAssets={unassignedAssets}
            query={query}
          />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the asset structure tree"
          aria-valuenow={treeWidth}
          aria-valuemin={MIN_TREE_WIDTH}
          aria-valuemax={MAX_TREE_WIDTH}
          tabIndex={0}
          onMouseDown={handleResizeStart}
          onKeyDown={handleResizeKeyDown}
          className="group flex w-4 shrink-0 cursor-col-resize items-stretch justify-center focus:outline-none"
        >
          <div className="w-px bg-outline-variant group-hover:bg-primary group-focus:bg-primary" />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pl-4 md-scrollbar">
          {detail}
        </div>
      </div>
    </div>
  );
}
