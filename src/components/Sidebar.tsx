"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";

const BREAKPOINT_QUERY = "(min-width: 1024px)";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: "space_dashboard", exact: true },
  { href: "/assets", label: "Assets", icon: "inventory_2", exact: false },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [forced, setForced] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(BREAKPOINT_QUERY);
    const resetToAuto = () => setForced(null);
    mediaQuery.addEventListener("change", resetToAuto);
    return () => mediaQuery.removeEventListener("change", resetToAuto);
  }, []);

  function toggle() {
    setForced((current) =>
      current !== null ? !current : !window.matchMedia(BREAKPOINT_QUERY).matches
    );
  }

  const containerWidth =
    forced === null ? "w-16 lg:w-56" : forced ? "w-56" : "w-16";
  const labelVisibility =
    forced === null ? "sr-only lg:not-sr-only" : forced ? "" : "sr-only";

  return (
    <nav
      className={`flex flex-col gap-1 border-r border-outline-variant bg-surface-container-low p-2 transition-[width] duration-200 ${containerWidth}`}
    >
      <Button
        variant="icon"
        onClick={toggle}
        aria-label="Toggle sidebar width"
        aria-expanded={forced === null ? undefined : forced}
        className="mb-2 self-start"
      >
        <Icon name="menu" />
      </Button>
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-full px-3 py-2 md-label-large ${
              isActive
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-on-surface/8"
            }`}
          >
            <Icon name={item.icon} filled={isActive} />
            <span className={labelVisibility}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
