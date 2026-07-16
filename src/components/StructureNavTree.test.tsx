import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureNavTree } from "./StructureNavTree";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

const now = new Date("2026-01-01T00:00:00.000Z");

function makeNode(
  overrides: Partial<StructureTreeNode> & Pick<StructureTreeNode, "id" | "name">
): StructureTreeNode {
  return {
    level: AssetStructureLevel.SITE,
    description: null,
    position: 0,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
    children: [],
    ...overrides,
  };
}

const tree = makeNode({
  id: "root",
  name: "Acme",
  level: AssetStructureLevel.ENTERPRISE,
  children: [
    makeNode({
      id: "site-1",
      name: "Plant A",
      parentId: "root",
      children: [
        makeNode({
          id: "equip-1",
          name: "Lathe",
          level: AssetStructureLevel.EQUIPMENT,
          parentId: "site-1",
        }),
      ],
    }),
  ],
});

describe("StructureNavTree", () => {
  it("renders links for every node, including nested children", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    render(<StructureNavTree tree={tree} />);

    expect(screen.getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      "/asset-structure/root"
    );
    expect(screen.getByRole("link", { name: "Plant A" })).toHaveAttribute(
      "href",
      "/asset-structure/site-1"
    );
    expect(screen.getByRole("link", { name: "Lathe" })).toHaveAttribute(
      "href",
      "/asset-structure/equip-1"
    );
  });

  it("marks the node matching the current pathname as active", () => {
    usePathname.mockReturnValue("/asset-structure/site-1");

    render(<StructureNavTree tree={tree} />);

    expect(screen.getByRole("link", { name: "Plant A" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Acme" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("does not render a nested list for leaf nodes", () => {
    usePathname.mockReturnValue("/asset-structure/equip-1");

    render(<StructureNavTree tree={tree} />);

    const leafLink = screen.getByRole("link", { name: "Lathe" });
    expect(leafLink.closest("li")?.querySelector("ul")).not.toBeInTheDocument();
  });
});
