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
      screen.getByRole("link", { name: "Hierarchy View" })
    ).toHaveAttribute("href", "/asset-structure");
    expect(screen.getByRole("link", { name: "Table View" })).toHaveAttribute(
      "href",
      "/asset-structure/table"
    );
  });

  it("marks Hierarchy View as active on /asset-structure", () => {
    usePathname.mockReturnValue("/asset-structure");

    render(<StructureViewTabs />);

    expect(
      screen.getByRole("link", { name: "Hierarchy View" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Table View" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Table View as active on /asset-structure/table", () => {
    usePathname.mockReturnValue("/asset-structure/table");

    render(<StructureViewTabs />);

    expect(screen.getByRole("link", { name: "Table View" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "Hierarchy View" })
    ).not.toHaveAttribute("aria-current");
  });
});
