"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/asset-structure", label: "Hierarchy View" },
  { href: "/asset-structure/table", label: "Table View" },
] as const;

export function StructureViewTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Asset structure views"
      className="flex gap-1 border-b border-outline-variant"
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`border-b-2 px-4 py-3 md-label-large ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
