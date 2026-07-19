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
    aasEndpointUrl: null,
    aasGlobalAssetId: null,
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

  it("renders no AAS section when the asset has no AAS reference", () => {
    render(<AssetDetailPanel asset={makeAsset()} structurePath={null} />);

    expect(
      screen.queryByText("Asset Administration Shell")
    ).not.toBeInTheDocument();
  });

  it("shows a fallback message when an AAS reference is set but data could not be loaded", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ aasEndpointUrl: "http://example.com/shells/abc" })}
        structurePath={null}
        aasData={null}
      />
    );

    expect(
      screen.getByText("Asset Administration Shell")
    ).toBeInTheDocument();
    expect(
      screen.getByText("AAS data could not be loaded.")
    ).toBeInTheDocument();
  });

  it("renders resolved AAS shell, submodel, and property data", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({
          aasGlobalAssetId: "https://asset-manager.example/assets/lathe-1",
        })}
        structurePath={null}
        aasData={{
          id: "https://asset-manager.example/aas/lathe-1",
          idShort: "TestLathe1",
          submodels: [
            {
              id: "https://asset-manager.example/sm/nameplate",
              idShort: "Nameplate",
              properties: [
                { idShort: "ManufacturerName", value: "Acme Machine Works" },
                { idShort: "YearOfConstruction", value: null },
              ],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("TestLathe1")).toBeInTheDocument();
    expect(screen.getByText("Nameplate")).toBeInTheDocument();
    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("Acme Machine Works")).toBeInTheDocument();
    expect(screen.getByText("YearOfConstruction")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("falls back to the raw id when idShort is blank", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ aasEndpointUrl: "http://example.com/shells/abc" })}
        structurePath={null}
        aasData={{
          id: "https://asset-manager.example/aas/lathe-1",
          idShort: "",
          submodels: [
            {
              id: "https://asset-manager.example/sm/nameplate",
              idShort: "",
              properties: [],
            },
          ],
        }}
      />
    );

    expect(
      screen.getByText("https://asset-manager.example/aas/lathe-1")
    ).toBeInTheDocument();
    expect(
      screen.getByText("https://asset-manager.example/sm/nameplate")
    ).toBeInTheDocument();
  });
});
