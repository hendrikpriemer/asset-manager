import { describe, expect, it } from "vitest";
import { AssetStructureLevel } from "@/generated/prisma/client";
import {
  assetMatchesSearch,
  filterStructureTree,
  filterAssetsWithStructurePath,
} from "./asset-search";

const now = new Date("2026-01-01T00:00:00.000Z");

describe("assetMatchesSearch", () => {
  it("matches everything when the query is empty or blank", () => {
    expect(assetMatchesSearch({ name: "Sensor", description: null }, "")).toBe(
      true
    );
    expect(
      assetMatchesSearch({ name: "Sensor", description: null }, "   ")
    ).toBe(true);
  });

  it("matches by name, case-insensitively", () => {
    expect(
      assetMatchesSearch({ name: "Sensor A", description: null }, "sensor")
    ).toBe(true);
  });

  it("matches by description", () => {
    expect(
      assetMatchesSearch(
        { name: "Sensor A", description: "Measures pressure" },
        "pressure"
      )
    ).toBe(true);
  });

  it("does not match when neither name nor description contains the query", () => {
    expect(
      assetMatchesSearch(
        { name: "Sensor A", description: "Measures pressure" },
        "gauge"
      )
    ).toBe(false);
  });

  it("does not match a null description", () => {
    expect(
      assetMatchesSearch({ name: "Sensor A", description: null }, "pressure")
    ).toBe(false);
  });

  it("matches by aasSearchText", () => {
    expect(
      assetMatchesSearch(
        { name: "Sensor A", description: null, aasSearchText: "nameplate voltage 230v" },
        "230v"
      )
    ).toBe(true);
  });

  it("does not match a null aasSearchText", () => {
    expect(
      assetMatchesSearch(
        { name: "Sensor A", description: null, aasSearchText: null },
        "230v"
      )
    ).toBe(false);
  });
});

describe("filterStructureTree", () => {
  const equip1 = {
    id: "equip-1",
    level: AssetStructureLevel.EQUIPMENT,
    name: "Lathe",
    description: "Old CNC machine",
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 0,
    parentId: "site-1",
    createdAt: now,
    updatedAt: now,
    assetCount: 1,
    assets: [{ id: "a2", name: "Gauge B", description: null, aasSearchText: null }],
    children: [],
  };
  const site1 = {
    id: "site-1",
    level: AssetStructureLevel.SITE,
    name: "Plant A",
    description: null,
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 0,
    parentId: "root",
    createdAt: now,
    updatedAt: now,
    assetCount: 1,
    assets: [{ id: "a1", name: "Sensor A", description: null, aasSearchText: null }],
    children: [equip1],
  };
  const site2 = {
    id: "site-2",
    level: AssetStructureLevel.SITE,
    name: "Plant B",
    description: null,
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 1,
    parentId: "root",
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
    assets: [],
    children: [],
  };
  const root = {
    id: "root",
    level: AssetStructureLevel.ENTERPRISE,
    name: "Acme",
    description: null,
    address: null,
    timezone: null,
    manufacturer: null,
    serialNumber: null,
    position: 0,
    parentId: null,
    createdAt: now,
    updatedAt: now,
    assetCount: 0,
    assets: [],
    children: [site1, site2],
  };

  it("returns the tree unchanged when the query is empty", () => {
    expect(filterStructureTree(root, "")).toBe(root);
  });

  it("keeps the whole subtree unchanged when the node itself matches", () => {
    expect(filterStructureTree(root, "acme")).toBe(root);
  });

  it("keeps a matching child's full subtree and drops non-matching siblings", () => {
    const result = filterStructureTree(root, "plant a");

    expect(result?.children).toEqual([site1]);
  });

  it("keeps the ancestor chain down to a matching descendant node", () => {
    const result = filterStructureTree(root, "cnc");

    expect(result?.children[0]?.id).toBe("site-1");
    expect(result?.children[0]?.children[0]).toBe(equip1);
  });

  it("keeps the ancestor chain down to a matching descendant asset", () => {
    const result = filterStructureTree(root, "gauge");

    expect(result?.children).toHaveLength(1);
    expect(result?.children[0]?.assets).toEqual([]);
    expect(result?.children[0]?.children[0]?.assets).toEqual([
      { id: "a2", name: "Gauge B", description: null, aasSearchText: null },
    ]);
  });

  it("filters a node's own assets down to only the matching ones", () => {
    const result = filterStructureTree(root, "sensor a");

    expect(result?.children[0]?.assets).toEqual([
      { id: "a1", name: "Sensor A", description: null, aasSearchText: null },
    ]);
    expect(result?.children[0]?.children).toEqual([]);
  });

  it("keeps the ancestor chain down to a descendant asset matching only by aasSearchText", () => {
    const equipWithAasMatch = {
      ...equip1,
      assets: [
        { id: "a3", name: "Motor C", description: null, aasSearchText: "rated voltage 400v" },
      ],
    };
    const siteWithAasMatch = { ...site1, children: [equipWithAasMatch] };
    const rootWithAasMatch = { ...root, children: [siteWithAasMatch, site2] };

    const result = filterStructureTree(rootWithAasMatch, "400v");

    expect(result?.children[0]?.assets).toEqual([]);
    expect(result?.children[0]?.children[0]?.assets).toEqual([
      { id: "a3", name: "Motor C", description: null, aasSearchText: "rated voltage 400v" },
    ]);
  });

  it("returns null when nothing in the tree matches", () => {
    expect(filterStructureTree(root, "nonexistent")).toBeNull();
  });
});

describe("filterAssetsWithStructurePath", () => {
  function makeAsset(
    overrides: Partial<Parameters<typeof filterAssetsWithStructurePath>[0][number]>
  ) {
    return {
      id: "a1",
      name: "Sensor A",
      description: null,
      structureNodeId: null,
      assetImageType: null,
      nameplateImageType: null,
      aasEndpointUrl: null,
      aasGlobalAssetId: null,
      aasSearchText: null,
      aasSearchIndexedAt: null,
      createdAt: now,
      updatedAt: now,
      structurePath: null,
      structureLevel: null,
      ...overrides,
    };
  }

  it("returns every asset when the query is empty", () => {
    const assets = [makeAsset({})];

    expect(filterAssetsWithStructurePath(assets, "")).toBe(assets);
  });

  it("matches by name", () => {
    const assets = [makeAsset({ name: "Sensor A" }), makeAsset({ name: "Gauge B" })];

    expect(filterAssetsWithStructurePath(assets, "sensor")).toEqual([
      assets[0],
    ]);
  });

  it("matches by description", () => {
    const assets = [
      makeAsset({ description: "Measures pressure" }),
      makeAsset({ description: "Measures temperature" }),
    ];

    expect(filterAssetsWithStructurePath(assets, "pressure")).toEqual([
      assets[0],
    ]);
  });

  it("matches by structure path", () => {
    const assets = [
      makeAsset({ structurePath: "Acme / Plant A" }),
      makeAsset({ structurePath: "Acme / Plant B" }),
    ];

    expect(filterAssetsWithStructurePath(assets, "plant a")).toEqual([
      assets[0],
    ]);
  });

  it("matches by aasSearchText", () => {
    const assets = [
      makeAsset({ aasSearchText: "nameplate voltage 230v" }),
      makeAsset({ aasSearchText: "nameplate voltage 400v" }),
    ];

    expect(filterAssetsWithStructurePath(assets, "230v")).toEqual([assets[0]]);
  });

  it("returns an empty array when nothing matches", () => {
    const assets = [makeAsset({})];

    expect(filterAssetsWithStructurePath(assets, "nonexistent")).toEqual([]);
  });
});
