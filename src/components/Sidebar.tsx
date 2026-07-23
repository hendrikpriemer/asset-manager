"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";

const BREAKPOINT_QUERY = "(min-width: 1024px)";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
  /** Prefixes used to determine the active state. */
  matchPrefixes: string[];
};

const MAIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    icon: "space_dashboard",
    exact: true,
    matchPrefixes: ["/"],
  },
  {
    href: "/asset-structure",
    label: "Asset Manager",
    icon: "account_tree",
    exact: false,
    // The standalone /assets/new and /assets/[id]/edit forms have no section
    // of their own anymore - they're reached only from within Asset Manager.
    matchPrefixes: ["/asset-structure", "/assets"],
  },
];

const FOOTER_NAV_ITEMS: NavItem[] = [
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    exact: false,
    matchPrefixes: ["/settings"],
  },
  {
    href: "/info/about",
    label: "Info",
    icon: "info",
    exact: false,
    matchPrefixes: ["/info"],
  },
];

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
  // Collapsed (icon-only rail): toggle button and nav icons are horizontally
  // centered in the rail. Expanded: toggle moves to the top-right corner,
  // nav icons align left next to their visible label.
  const toggleAlignment =
    forced === null ? "self-center lg:self-end" : forced ? "self-end" : "self-center";
  const navItemJustify =
    forced === null
      ? "justify-center lg:justify-start"
      : forced
        ? "justify-start"
        : "justify-center";
  const menuIconVisibility = forced === null ? "lg:hidden" : forced ? "hidden" : "";
  const closeIconVisibility =
    forced === null ? "hidden lg:inline-block" : forced ? "inline-block" : "hidden";

  return (
    <nav
      className={`flex shrink-0 flex-col gap-1 overflow-y-auto border-r border-outline-variant bg-surface-container-low p-2 transition-[width] duration-200 ${containerWidth}`}
    >
      <Button
        variant="icon"
        onClick={toggle}
        aria-label="Toggle sidebar width"
        aria-expanded={forced === null ? undefined : forced}
        className={`mb-2 ${toggleAlignment}`}
      >
        {/*
          Visibility toggling lives on a wrapper span, not on the Icon's own
          className: Google's Material Symbols stylesheet ships an unlayered
          `.material-symbols-outlined { display: inline-block }` rule, which
          (per CSS cascade layers) beats Tailwind's layered `hidden`/`lg:hidden`
          utilities if applied to the same element, regardless of specificity.
        */}
        <span className={menuIconVisibility}>
          <Icon name="menu" />
        </span>
        <span className={closeIconVisibility}>
          <Icon name="close" />
        </span>
      </Button>
      {MAIN_NAV_ITEMS.map((item) => renderNavItem(item))}
      <div className="mt-auto flex flex-col gap-1">
        {FOOTER_NAV_ITEMS.map((item) => renderNavItem(item))}
      </div>
    </nav>
  );

  function renderNavItem(item: NavItem) {
    const isActive = item.exact
      ? pathname === item.href
      : item.matchPrefixes.some((prefix) => pathname.startsWith(prefix));
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-3 rounded-full px-3 py-2 md-label-large ${navItemJustify} ${
          isActive
            ? "bg-secondary-container text-on-secondary-container"
            : "text-on-surface-variant hover:bg-on-surface/8"
        }`}
      >
        <Icon name={item.icon} filled={isActive} />
        <span className={labelVisibility}>{item.label}</span>
      </Link>
    );
  }
}
