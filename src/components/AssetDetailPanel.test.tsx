import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Asset } from "@/generated/prisma/client";
import { AssetDetailPanel } from "./AssetDetailPanel";

const now = new Date("2026-01-01T00:00:00.000Z");

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    name: "Lathe",
    description: "Main production lathe",
    structureNodeId: "site-1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("AssetDetailPanel", () => {
  it("renders the asset name, structure path, and description", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset()}
        structurePath="Acme / Plant A"
      />
    );

    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lathe" })).toBeInTheDocument();
    expect(screen.getByText("Main production lathe")).toBeInTheDocument();
  });

  it("shows Unassigned when the asset has no structure path", () => {
    render(<AssetDetailPanel asset={makeAsset()} structurePath={null} />);

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("omits the description paragraph when the asset has none", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ description: null })}
        structurePath={null}
      />
    );

    expect(screen.queryByText("Main production lathe")).not.toBeInTheDocument();
  });

  it("links to the asset's edit page", () => {
    render(<AssetDetailPanel asset={makeAsset()} structurePath={null} />);

    expect(screen.getByRole("link", { name: "Edit asset" })).toHaveAttribute(
      "href",
      "/assets/asset-1/edit"
    );
  });
});
