import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { Asset, AssetStructureNode } from "@/generated/prisma/client";
import { StructureNodeDetail } from "./StructureNodeDetail";

const now = new Date("2026-01-01T00:00:00.000Z");

function makeNode(overrides: Partial<AssetStructureNode> = {}): AssetStructureNode {
  return {
    id: "site-1",
    level: AssetStructureLevel.SITE,
    name: "Plant A",
    description: "Main production plant",
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 0,
    parentId: "root",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

type StructureNodeAsset = Omit<Asset, "assetImage" | "nameplateImage">;

function makeAsset(overrides: Partial<StructureNodeAsset> = {}): StructureNodeAsset {
  return {
    id: "asset-1",
    name: "Lathe",
    description: null,
    structureNodeId: null,
    assetImageType: null,
    nameplateImageType: null,
    aasEndpointUrl: null,
    aasGlobalAssetId: null,
    aasSearchText: null,
    aasSearchIndexedAt: null,
    nameplateSubmodelGeneratedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("StructureNodeDetail", () => {
  it("renders the breadcrumb, name, level badge, and description", () => {
    render(
      <StructureNodeDetail
        node={makeNode()}
        breadcrumb={["Acme", "Plant A"]}
        assets={[]}
      />
    );

    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plant A" })
    ).toBeInTheDocument();
    expect(screen.getByText("Site")).toBeInTheDocument();
    expect(screen.getByText("Main production plant")).toBeInTheDocument();
  });

  it("omits the description paragraph when the node has none", () => {
    render(
      <StructureNodeDetail
        node={makeNode({ description: null })}
        breadcrumb={["Acme", "Plant A"]}
        assets={[]}
      />
    );

    expect(
      screen.queryByText("Main production plant")
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when no assets are assigned", () => {
    render(
      <StructureNodeDetail node={makeNode()} breadcrumb={["Plant A"]} assets={[]} />
    );

    expect(
      screen.getByText("No assets assigned to this level.")
    ).toBeInTheDocument();
  });

  it("lists assigned assets as links to their in-context detail view", () => {
    render(
      <StructureNodeDetail
        node={makeNode()}
        breadcrumb={["Plant A"]}
        assets={[makeAsset()]}
      />
    );

    expect(screen.getByRole("link", { name: "Lathe" })).toHaveAttribute(
      "href",
      "/asset-structure/asset/asset-1"
    );
  });
});
