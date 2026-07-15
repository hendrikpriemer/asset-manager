import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetTable } from "./AssetTable";
import type { Asset } from "@/generated/prisma/client";

vi.mock("@/lib/actions", () => ({ deleteAsset: vi.fn() }));

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: "asset-1",
    name: "Laptop",
    description: "Work laptop",
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
});
