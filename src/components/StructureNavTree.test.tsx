import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureNodeAsset, StructureTreeNode } from "@/lib/asset-structure";
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
      assets: [{ id: "asset-1", name: "Sensor A", description: null, aasSearchText: null }],
      children: [
        makeNode({
          id: "equip-1",
          name: "Lathe",
          level: AssetStructureLevel.EQUIPMENT,
          parentId: "site-1",
          description: "Old CNC machine",
          assets: [{ id: "asset-2", name: "Gauge B", description: null, aasSearchText: null }],
        }),
        makeNode({
          id: "equip-2",
          name: "Empty Equipment",
          level: AssetStructureLevel.EQUIPMENT,
          parentId: "site-1",
        }),
      ],
    }),
  ],
});

function renderTree(
  unassignedAssets: StructureNodeAsset[] = [],
  query: string = ""
) {
  return render(
    <StructureNavTree
      tree={tree}
      unassignedAssets={unassignedAssets}
      query={query}
    />
  );
}

describe("StructureNavTree", () => {
  it("renders links for every node, including nested children", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree();

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

    renderTree();

    expect(screen.getByRole("link", { name: "Plant A" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Acme" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("does not render a nested list for a node with no children and no assets", () => {
    usePathname.mockReturnValue("/asset-structure/equip-2");

    renderTree();

    const leafLink = screen.getByRole("link", { name: "Empty Equipment" });
    expect(leafLink.closest("li")?.querySelector("ul")).not.toBeInTheDocument();
  });

  it("renders assigned assets as leaf links under their node, alongside child nodes", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree();

    expect(screen.getByRole("link", { name: /Sensor A/ })).toHaveAttribute(
      "href",
      "/asset-structure/asset/asset-1"
    );
  });

  it("marks an asset leaf link as active when it matches the current pathname", () => {
    usePathname.mockReturnValue("/asset-structure/asset/asset-1");

    renderTree();

    expect(screen.getByRole("link", { name: /Sensor A/ })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders a nested list for a node with assigned assets but no child nodes", () => {
    usePathname.mockReturnValue("/asset-structure/equip-1");

    renderTree();

    expect(screen.getByRole("link", { name: /Gauge B/ })).toHaveAttribute(
      "href",
      "/asset-structure/asset/asset-2"
    );
  });

  it("expands every node by default", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree();

    expect(screen.getByRole("link", { name: "Plant A" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lathe" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse Acme" })
    ).toBeInTheDocument();
  });

  it("collapses a node's children when its toggle is clicked, and re-expands on a second click", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree();

    await user.click(screen.getByRole("button", { name: "Collapse Acme" }));

    expect(screen.queryByRole("link", { name: "Plant A" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand Acme" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand Acme" }));

    expect(screen.getByRole("link", { name: "Plant A" })).toBeInTheDocument();
  });

  it("does not render a toggle button for a node with no children and no assets", () => {
    usePathname.mockReturnValue("/asset-structure/equip-2");

    renderTree();

    expect(
      screen.queryByRole("button", { name: /Empty Equipment/ })
    ).not.toBeInTheDocument();
  });

  it("renders an Unassigned Assets bucket listing every unassigned asset", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([{ id: "asset-3", name: "Loose Sensor", description: null, aasSearchText: null }]);

    expect(screen.getByText("Unassigned Assets")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Loose Sensor/ })).toHaveAttribute(
      "href",
      "/asset-structure/asset/asset-3"
    );
  });

  it("expands the Unassigned Assets bucket by default and collapses/re-expands on toggle", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([{ id: "asset-3", name: "Loose Sensor", description: null, aasSearchText: null }]);

    expect(screen.getByRole("link", { name: /Loose Sensor/ })).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Collapse Unassigned Assets" })
    );
    expect(
      screen.queryByRole("link", { name: /Loose Sensor/ })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Expand Unassigned Assets" })
    );
    expect(screen.getByRole("link", { name: /Loose Sensor/ })).toBeInTheDocument();
  });

  it("renders the Unassigned Assets bucket without a toggle when there are no unassigned assets", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([]);

    expect(screen.getByText("Unassigned Assets")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Unassigned Assets/ })
    ).not.toBeInTheDocument();
  });

  it("filters the tree down to nodes matching the search query, dropping non-matching branches", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([], "lathe");

    expect(screen.getByRole("link", { name: "Lathe" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Empty Equipment" })
    ).not.toBeInTheDocument();
  });

  it("matches nodes by description", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([], "cnc");

    expect(screen.getByRole("link", { name: "Lathe" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Empty Equipment" })
    ).not.toBeInTheDocument();
  });

  it("matches assets by name and keeps their ancestor chain visible", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([], "gauge");

    expect(screen.getByRole("link", { name: /Gauge B/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plant A" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sensor A/ })).not.toBeInTheDocument();
  });

  it("reveals matches even under a node the user manually collapsed", async () => {
    const user = userEvent.setup();
    usePathname.mockReturnValue("/asset-structure/root");

    const { rerender } = renderTree([], "");

    await user.click(screen.getByRole("button", { name: "Collapse Acme" }));
    expect(screen.queryByRole("link", { name: "Plant A" })).not.toBeInTheDocument();

    rerender(
      <StructureNavTree tree={tree} unassignedAssets={[]} query="lathe" />
    );

    expect(screen.getByRole("link", { name: "Lathe" })).toBeInTheDocument();
  });

  it("restores the previous view when the search query is cleared", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    const { rerender } = renderTree([], "lathe");
    expect(
      screen.queryByRole("link", { name: "Empty Equipment" })
    ).not.toBeInTheDocument();

    rerender(<StructureNavTree tree={tree} unassignedAssets={[]} query="" />);
    expect(screen.getByRole("link", { name: "Empty Equipment" })).toBeInTheDocument();
  });

  it("shows a 'No matches found' message when nothing matches", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree([], "nonexistent");

    expect(screen.getByText("No matches found.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Acme" })).not.toBeInTheDocument();
  });

  it("filters the Unassigned Assets bucket by the search query", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree(
      [
        { id: "asset-3", name: "Loose Sensor", description: null, aasSearchText: null },
        { id: "asset-4", name: "Spare Gauge", description: null, aasSearchText: null },
      ],
      "spare"
    );

    expect(screen.getByRole("link", { name: /Spare Gauge/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Loose Sensor/ })
    ).not.toBeInTheDocument();
  });

  it("shows 'No matches found' when neither the tree nor unassigned assets match", () => {
    usePathname.mockReturnValue("/asset-structure/root");

    renderTree(
      [{ id: "asset-3", name: "Loose Sensor", description: null, aasSearchText: null }],
      "nonexistent"
    );

    expect(screen.getByText("No matches found.")).toBeInTheDocument();
  });
});
