"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StructureTreeNode } from "@/lib/asset-structure";

function StructureNavTreeNode({ node }: { node: StructureTreeNode }) {
  const pathname = usePathname();
  const href = `/asset-structure/${node.id}`;
  const isActive = pathname === href;

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
      {node.children.length > 0 && (
        <ul className="ml-4 flex flex-col gap-1 border-l border-outline-variant pl-2">
          {node.children.map((child) => (
            <StructureNavTreeNode key={child.id} node={child} />
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
