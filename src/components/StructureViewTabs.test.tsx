import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StructureViewTabs } from "./StructureViewTabs";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("StructureViewTabs", () => {
  it("renders both view links", () => {
    usePathname.mockReturnValue("/asset-structure");

    render(<StructureViewTabs />);

    expect(
      screen.getByRole("link", { name: "Asset Structure" })
    ).toHaveAttribute("href", "/asset-structure");
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "href",
      "/asset-structure/table"
    );
  });

  it("marks Asset Structure as active on /asset-structure", () => {
    usePathname.mockReturnValue("/asset-structure");

    render(<StructureViewTabs />);

    expect(
      screen.getByRole("link", { name: "Asset Structure" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Assets" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Assets as active on /asset-structure/table", () => {
    usePathname.mockReturnValue("/asset-structure/table");

    render(<StructureViewTabs />);

    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "Asset Structure" })
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps Asset Structure active when viewing a structure node's detail page", () => {
    usePathname.mockReturnValue("/asset-structure/site-1");

    render(<StructureViewTabs />);

    expect(
      screen.getByRole("link", { name: "Asset Structure" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Assets" })
    ).not.toHaveAttribute("aria-current");
  });

  it("keeps Asset Structure active when viewing an asset's detail page", () => {
    usePathname.mockReturnValue("/asset-structure/asset/asset-1");

    render(<StructureViewTabs />);

    expect(
      screen.getByRole("link", { name: "Asset Structure" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Assets" })
    ).not.toHaveAttribute("aria-current");
  });
});
