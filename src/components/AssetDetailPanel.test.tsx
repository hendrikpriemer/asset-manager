import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Asset } from "@/generated/prisma/client";
import { AssetDetailPanel } from "./AssetDetailPanel";

type AssetDetail = Omit<Asset, "assetImage" | "nameplateImage">;

const now = new Date("2026-01-01T00:00:00.000Z");

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "asset-1",
    name: "Lathe",
    description: "Main production lathe",
    structureNodeId: "site-1",
    assetImageType: null,
    nameplateImageType: null,
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

  it("renders no photos when neither image type is set", () => {
    render(<AssetDetailPanel asset={makeAsset()} structurePath={null} />);

    expect(screen.queryByAltText(/photo|nameplate/)).not.toBeInTheDocument();
  });

  it("renders the asset photo when assetImageType is set", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ assetImageType: "image/jpeg" })}
        structurePath={null}
      />
    );

    expect(screen.getByAltText("Lathe photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/asset"
    );
    expect(screen.queryByAltText("Lathe nameplate")).not.toBeInTheDocument();
  });

  it("renders the nameplate photo when nameplateImageType is set", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ nameplateImageType: "image/png" })}
        structurePath={null}
      />
    );

    expect(screen.getByAltText("Lathe nameplate")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/nameplate"
    );
    expect(screen.queryByAltText("Lathe photo")).not.toBeInTheDocument();
  });
});
