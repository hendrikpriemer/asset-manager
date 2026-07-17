"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABLE_HREF = "/asset-structure/table";

export function StructureViewTabs() {
  const pathname = usePathname();
  const isTableActive = pathname === TABLE_HREF;

  const tabs = [
    {
      href: "/asset-structure",
      label: "Asset Structure",
      isActive: pathname.startsWith("/asset-structure") && !isTableActive,
    },
    { href: TABLE_HREF, label: "Assets", isActive: isTableActive },
  ];

  return (
    <nav
      aria-label="Asset structure views"
      className="flex gap-1 border-b border-outline-variant"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.isActive ? "page" : undefined}
          className={`border-b-2 px-4 py-3 md-label-large ${
            tab.isActive
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
