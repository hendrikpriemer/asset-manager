import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureBrowserSection } from "./StructureBrowserSection";

vi.mock("next/navigation", () => ({
  usePathname: () => "/asset-structure/site-1",
}));

const now = new Date("2026-01-01T00:00:00.000Z");

const tree: StructureTreeNode = {
  id: "root",
  level: AssetStructureLevel.ENTERPRISE,
  name: "Acme",
  description: null,
  position: 0,
  parentId: null,
  createdAt: now,
  updatedAt: now,
  assetCount: 0,
  assets: [],
  children: [
    {
      id: "site-1",
      level: AssetStructureLevel.SITE,
      name: "Plant A",
      description: null,
      position: 0,
      parentId: "root",
      createdAt: now,
      updatedAt: now,
      assetCount: 0,
      assets: [],
      children: [],
    },
  ],
};

describe("StructureBrowserSection", () => {
  it("renders the nav tree alongside the given detail content", () => {
    render(
      <StructureBrowserSection
        tree={tree}
        unassignedAssets={[]}
        detail={<h1>Plant A detail</h1>}
      />
    );

    expect(screen.getByRole("link", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plant A" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plant A detail" })
    ).toBeInTheDocument();
  });

  it("renders the search field and the Edit Asset Structure button in the same row", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const search = screen.getByRole("searchbox", {
      name: "Search asset structure",
    });
    const editLink = screen.getByRole("link", {
      name: "Edit Asset Structure",
    });

    expect(editLink).toHaveAttribute("href", "/asset-structure/edit");
    const row = search.closest("div")?.parentElement;
    expect(row).toContainElement(editLink);
  });

  it("filters the nav tree as the user types in the search field", async () => {
    const user = userEvent.setup();
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search asset structure" }),
      "nonexistent"
    );

    expect(screen.getByText("No matches found.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acme" })).not.toBeInTheDocument();
  });
});
