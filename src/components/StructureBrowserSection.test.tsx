import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureBrowserSection } from "./StructureBrowserSection";

vi.mock("next/navigation", () => ({
  usePathname: () => "/asset-structure/site-1",
}));

const TREE_WIDTH_STORAGE_KEY = "asset-structure:tree-width";

beforeEach(() => {
  window.localStorage.clear();
});

const now = new Date("2026-01-01T00:00:00.000Z");

const tree: StructureTreeNode = {
  id: "root",
  level: AssetStructureLevel.ENTERPRISE,
  name: "Acme",
  description: null,
  address: null,
  timezone: null,
  manufacturer: null,
  serialNumber: null,
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
      address: null,
      timezone: null,
      manufacturer: null,
      serialNumber: null,
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

  it("resizes the tree column by dragging the separator", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });
    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;

    expect(treeColumn).toHaveStyle({ width: "320px" });

    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 50 });
    fireEvent.mouseUp(window);

    expect(treeColumn).toHaveStyle({ width: "370px" });

    fireEvent.mouseMove(window, { clientX: 200 });

    expect(treeColumn).toHaveStyle({ width: "370px" });
  });

  it("clamps the tree column width to the minimum when dragged far left", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });
    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;

    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: -1000 });
    fireEvent.mouseUp(window);

    expect(treeColumn).toHaveStyle({ width: "200px" });
  });

  it("clamps the tree column width to the maximum when dragged far right", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });
    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;

    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 1000 });
    fireEvent.mouseUp(window);

    expect(treeColumn).toHaveStyle({ width: "600px" });
  });

  it("resizes the tree column with the arrow keys when the separator is focused", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });
    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(treeColumn).toHaveStyle({ width: "336px" });

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(treeColumn).toHaveStyle({ width: "304px" });
  });

  it("ignores keys other than the arrow keys on the separator", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });
    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;

    fireEvent.keyDown(separator, { key: "Enter" });

    expect(treeColumn).toHaveStyle({ width: "320px" });
  });

  it("restores a previously stored tree width on mount", () => {
    window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, "450");

    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;
    expect(treeColumn).toHaveStyle({ width: "450px" });
  });

  it("clamps a stored tree width outside the valid range on mount", () => {
    window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, "50");

    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;
    expect(treeColumn).toHaveStyle({ width: "200px" });
  });

  it("ignores a non-numeric stored tree width and falls back to the default", () => {
    window.localStorage.setItem(TREE_WIDTH_STORAGE_KEY, "not-a-number");

    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const treeColumn = screen.getByRole("navigation", {
      name: "Asset structure",
    }).parentElement;
    expect(treeColumn).toHaveStyle({ width: "320px" });
  });

  it("persists the width to localStorage when the tree column is resized", () => {
    render(
      <StructureBrowserSection tree={tree} unassignedAssets={[]} detail={null} />
    );

    const separator = screen.getByRole("separator", {
      name: "Resize the asset structure tree",
    });

    fireEvent.mouseDown(separator, { clientX: 0 });
    fireEvent.mouseMove(window, { clientX: 50 });
    fireEvent.mouseUp(window);

    expect(window.localStorage.getItem(TREE_WIDTH_STORAGE_KEY)).toBe("370");
  });
});
