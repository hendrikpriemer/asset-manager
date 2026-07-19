import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableAssetTable } from "./SearchableAssetTable";
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
    structurePath: null,
    structureLevel: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

describe("SearchableAssetTable", () => {
  it("renders a search field and the full table when there is no query", () => {
    render(<SearchableAssetTable assets={[makeAsset()]} />);

    expect(
      screen.getByRole("searchbox", { name: "Search assets" })
    ).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
  });

  it("renders the New Asset button in the same row as the search field", () => {
    render(<SearchableAssetTable assets={[makeAsset()]} />);

    const search = screen.getByRole("searchbox", { name: "Search assets" });
    const newAssetLink = screen.getByRole("link", { name: "New Asset" });

    expect(newAssetLink).toHaveAttribute("href", "/assets/new");
    const row = search.closest("div")?.parentElement;
    expect(row).toContainElement(newAssetLink);
  });

  it("delegates to AssetTable's own empty state when there are no assets at all", () => {
    render(<SearchableAssetTable assets={[]} />);

    expect(
      screen.getByRole("heading", { name: "No assets yet" })
    ).toBeInTheDocument();
  });

  it("filters rows by name", async () => {
    const user = userEvent.setup();
    render(
      <SearchableAssetTable
        assets={[makeAsset({ name: "Laptop" }), makeAsset({ id: "asset-2", name: "Gauge", description: null })]}
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search assets" }),
      "laptop"
    );

    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.queryByText("Gauge")).not.toBeInTheDocument();
  });

  it("filters rows by description", async () => {
    const user = userEvent.setup();
    render(
      <SearchableAssetTable
        assets={[
          makeAsset({ name: "Laptop", description: "Work laptop" }),
          makeAsset({ id: "asset-2", name: "Gauge", description: "Pressure gauge" }),
        ]}
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search assets" }),
      "pressure"
    );

    expect(screen.getByText("Gauge")).toBeInTheDocument();
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
  });

  it("filters rows by structure path", async () => {
    const user = userEvent.setup();
    render(
      <SearchableAssetTable
        assets={[
          makeAsset({ name: "Laptop", structurePath: "Acme / Plant A" }),
          makeAsset({ id: "asset-2", name: "Gauge", structurePath: "Acme / Plant B" }),
        ]}
      />
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search assets" }),
      "plant b"
    );

    expect(screen.getByText("Gauge")).toBeInTheDocument();
    expect(screen.queryByText("Laptop")).not.toBeInTheDocument();
  });

  it("shows a 'no assets match' message when the query matches nothing", async () => {
    const user = userEvent.setup();
    render(<SearchableAssetTable assets={[makeAsset()]} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search assets" }),
      "nonexistent"
    );

    expect(
      screen.getByText("No assets match your search.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("restores the full table when the search query is cleared", async () => {
    const user = userEvent.setup();
    render(
      <SearchableAssetTable
        assets={[makeAsset({ name: "Laptop" }), makeAsset({ id: "asset-2", name: "Gauge", description: null })]}
      />
    );
    const searchbox = screen.getByRole("searchbox", { name: "Search assets" });

    await user.type(searchbox, "laptop");
    expect(screen.queryByText("Gauge")).not.toBeInTheDocument();

    await user.clear(searchbox);
    expect(screen.getByText("Gauge")).toBeInTheDocument();
  });
});
