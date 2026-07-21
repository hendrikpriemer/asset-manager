import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Asset } from "@/generated/prisma/client";
import { AssetDetailPanel } from "./AssetDetailPanel";

vi.mock("@/lib/actions", () => ({ refreshAasSearchIndex: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
    aasSearchText: null,
    aasSearchIndexedAt: null,
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
    expect(screen.getByText("Not yet indexed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Refresh search index/ })
    ).toBeInTheDocument();
  });

  it("shows when the search index was last updated", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({
          aasEndpointUrl: "http://example.com/shells/abc",
          aasSearchIndexedAt: new Date("2026-03-01T12:30:00.000Z"),
        })}
        structurePath={null}
        aasData={null}
      />
    );

    expect(
      screen.getByText(
        `Search index last updated ${new Date("2026-03-01T12:30:00.000Z").toLocaleString("en-US", { timeZone: "UTC" })}`
      )
    ).toBeInTheDocument();
  });

  it("does not show the AAS index status or refresh button when the asset has no AAS reference", () => {
    render(<AssetDetailPanel asset={makeAsset()} structurePath={null} />);

    expect(screen.queryByText("Not yet indexed")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Refresh search index/ })
    ).not.toBeInTheDocument();
  });

  it("renders the resolved shell idShort and delegates submodels to AasViewer", () => {
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
              displayName: null,
              description: null,
              templateName: null,
              version: null,
              properties: [
                { idShort: "ManufacturerName", value: "Acme Machine Works" },
              ],
              files: [],
              groups: [],
            },
          ],
        }}
      />
    );

    expect(screen.getByText("TestLathe1")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nameplate" })).toBeInTheDocument();
    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("Acme Machine Works")).toBeInTheDocument();
  });

  it("falls back to the raw id when the shell idShort is blank", () => {
    render(
      <AssetDetailPanel
        asset={makeAsset({ aasEndpointUrl: "http://example.com/shells/abc" })}
        structurePath={null}
        aasData={{
          id: "https://asset-manager.example/aas/lathe-1",
          idShort: "",
          submodels: [],
        }}
      />
    );

    expect(
      screen.getByText("https://asset-manager.example/aas/lathe-1")
    ).toBeInTheDocument();
  });
});
