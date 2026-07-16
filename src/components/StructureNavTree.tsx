"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { Icon } from "@/components/Icon";

function StructureNavTreeNode({ node }: { node: StructureTreeNode }) {
  const pathname = usePathname();
  const href = `/asset-structure/${node.id}`;
  const isActive = pathname === href;
  const hasNestedItems = node.children.length > 0 || node.assets.length > 0;

  return (
    <li>
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`block truncate rounded-full px-3 py-1.5 md-label-large ${
          isActive
            ? "bg-secondary-container text-on-secondary-container"
            : "text-on-surface-variant hover:bg-on-surface/8"
        }`}
      >
        {node.name}
      </Link>
      {hasNestedItems && (
        <ul className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-2">
          {node.children.map((child) => (
            <StructureNavTreeNode key={child.id} node={child} />
          ))}
          {node.assets.map((asset) => (
            <li key={asset.id}>
              <Link
                href={`/assets/${asset.id}/edit`}
                className="flex items-center gap-2 truncate rounded-full px-3 py-1.5 md-label-large text-on-surface-variant hover:bg-on-surface/8"
              >
                <Icon name="inventory_2" className="text-base" />
                {asset.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function StructureNavTree({ tree }: { tree: StructureTreeNode }) {
  return (
    <nav aria-label="Asset structure">
      <ul className="flex flex-col gap-1">
        <StructureNavTreeNode node={tree} />
      </ul>
    </nav>
  );
}
