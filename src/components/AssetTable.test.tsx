import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetTable } from "./AssetTable";
import { AssetStructureLevel } from "@/generated/prisma/client";
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
    assetImageType: null,
    nameplateImageType: null,
    aasEndpointUrl: null,
    aasGlobalAssetId: null,
    aasSearchText: null,
    aasSearchIndexedAt: null,
    nameplateSubmodelGeneratedAt: null,
    structurePath: null,
    structureLevel: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AssetTable", () => {
  it("renders an empty state when there are no assets", () => {
    render(<AssetTable assets={[]} />);

    expect(
      screen.getByRole("heading", { name: "No assets yet" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row per asset with name, description, and an edit link", () => {
    const asset = makeAsset();

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Work laptop")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Laptop" })).toHaveAttribute(
      "href",
      "/assets/asset-1/edit"
    );
  });

  it("shows Edit and Delete tooltips for the row's actions", () => {
    const asset = makeAsset();

    render(<AssetTable assets={[asset]} />);

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.map((tooltip) => tooltip.textContent)).toEqual([
      "Edit",
      "Delete",
    ]);
  });

  it("shows a placeholder when the asset has no description", () => {
    const asset = makeAsset({ description: null });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getAllByText("—")).toHaveLength(2);
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

  it("shows a dash when the asset has no assigned level", () => {
    const asset = makeAsset({ structureLevel: null });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getAllByText("—")).toHaveLength(1);
  });

  it("shows the level badge when the asset has an assigned level", () => {
    const asset = makeAsset({ structureLevel: AssetStructureLevel.WORK_CENTER });

    render(<AssetTable assets={[asset]} />);

    expect(screen.getByText("Work Center")).toBeInTheDocument();
  });
});
