"use client";

import { useState } from "react";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureNodeRow } from "@/components/StructureNodeRow";
import { Button } from "@/components/Button";

function collectAllIds(node: StructureTreeNode): string[] {
  return [node.id, ...node.children.flatMap(collectAllIds)];
}

export function StructureTreeEditor({ tree }: { tree: StructureTreeNode }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(collectAllIds(tree))
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

  function expandAll() {
    setExpandedIds(new Set(collectAllIds(tree)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button variant="text" onClick={expandAll}>
          Expand all
        </Button>
        <Button variant="text" onClick={collapseAll}>
          Collapse all
        </Button>
      </div>
      <ul>
        <StructureNodeRow
          node={tree}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          isFirstChild
          isLastChild
        />
      </ul>
    </div>
  );
}
