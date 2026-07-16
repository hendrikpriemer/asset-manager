import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureTreeEditor } from "./StructureTreeEditor";

vi.mock("@/components/StructureNodeRow", () => ({
  StructureNodeRow: ({
    node,
    expandedIds,
    onToggleExpand,
  }: {
    node: StructureTreeNode;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
  }) => (
    <div>
      <span>{node.name}</span>
      <span data-testid="expanded-ids">
        {[...expandedIds].sort().join(",")}
      </span>
      <button onClick={() => onToggleExpand(node.id)}>
        toggle {node.id}
      </button>
    </div>
  ),
}));

const now = new Date("2026-01-01T00:00:00.000Z");

function buildTree(): StructureTreeNode {
  const child = {
    id: "site",
    level: AssetStructureLevel.SITE,
    name: "Laatzen",
    description: null,
    position: 0,
    parentId: "root",
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
    assets: [],
    children: [],
  };
  return {
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
    children: [child],
  };
}

describe("StructureTreeEditor", () => {
  it("renders the root node", () => {
    render(<StructureTreeEditor tree={buildTree()} />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("expands every node by default", () => {
    render(<StructureTreeEditor tree={buildTree()} />);

    expect(screen.getByTestId("expanded-ids")).toHaveTextContent(
      "root,site"
    );
  });

  it("collapses everything when Collapse all is clicked", async () => {
    const user = userEvent.setup();
    render(<StructureTreeEditor tree={buildTree()} />);

    await user.click(screen.getByRole("button", { name: "Collapse all" }));

    expect(screen.getByTestId("expanded-ids")).toHaveTextContent("");
  });

  it("expands everything again when Expand all is clicked", async () => {
    const user = userEvent.setup();
    render(<StructureTreeEditor tree={buildTree()} />);

    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    await user.click(screen.getByRole("button", { name: "Expand all" }));

    expect(screen.getByTestId("expanded-ids")).toHaveTextContent(
      "root,site"
    );
  });

  it("toggles an individual node id in and out of the expanded set", async () => {
    const user = userEvent.setup();
    render(<StructureTreeEditor tree={buildTree()} />);

    await user.click(screen.getByRole("button", { name: "toggle root" }));
    expect(screen.getByTestId("expanded-ids")).toHaveTextContent("site");

    await user.click(screen.getByRole("button", { name: "toggle root" }));
    expect(screen.getByTestId("expanded-ids")).toHaveTextContent(
      "root,site"
    );
  });
});
