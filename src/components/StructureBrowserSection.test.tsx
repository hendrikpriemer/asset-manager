import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { Asset, AssetStructureNode } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { StructureBrowserSection } from "./StructureBrowserSection";

vi.mock("next/navigation", () => ({
  usePathname: () => "/asset-structure/site-1",
}));

const now = new Date("2026-01-01T00:00:00.000Z");

const tree: StructureTreeNode = {
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
  children: [
    {
      id: "site-1",
      level: AssetStructureLevel.SITE,
      name: "Plant A",
      description: null,
      position: 0,
      parentId: "root",
      createdAt: now,
      updatedAt: now,
      assetCount: 0,
      assets: [],
      children: [],
    },
  ],
};

const node: AssetStructureNode = {
  id: "site-1",
  level: AssetStructureLevel.SITE,
  name: "Plant A",
  description: null,
  position: 0,
  parentId: "root",
  createdAt: now,
  updatedAt: now,
};

const assets: Asset[] = [];

describe("StructureBrowserSection", () => {
  it("renders the nav tree alongside the node detail", () => {
    render(
      <StructureBrowserSection
        tree={tree}
        node={node}
        breadcrumb={["Acme", "Plant A"]}
        assets={assets}
      />
    );

    expect(screen.getByRole("link", { name: "Acme" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plant A" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Plant A" })
    ).toBeInTheDocument();
    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
  });
});
