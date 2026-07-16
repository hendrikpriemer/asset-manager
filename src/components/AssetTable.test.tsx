import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetTable } from "./AssetTable";
import type { AssetWithStructurePath } from "@/lib/asset-structure";

vi.mock("@/lib/actions", () => ({ deleteAsset: vi.fn() }));

function makeAsset(
  overrides: Partial<AssetWithStructurePath> = {}
): AssetWithStructurePath {
  return {
    id: "asset-1",
    name: "Laptop",
    description: "Work laptop",
    structureNodeId: null,
    structurePath: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AssetTable", () => {
  it("renders an empty state when there are no assets", () => {
    render(<AssetTable assets={[]} />);

    expect(screen.getByText("No assets yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row per asset with name, description, and an edit link", () => {
    const asset = makeAsset();

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Work laptop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/assets/asset-1/edit"
    );
  });

  it("shows a placeholder when the asset has no description", () => {
    const asset = makeAsset({ description: null });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows Unassigned when the asset has no structure path", () => {
    const asset = makeAsset({ structurePath: null });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("shows the structure path when the asset is assigned", () => {
    const asset = makeAsset({ structurePath: "Acme / Plant A" });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
  });
});
