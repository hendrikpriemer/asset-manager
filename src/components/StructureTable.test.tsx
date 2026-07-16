import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { FlattenedStructureRow } from "@/lib/asset-structure";
import { StructureTable } from "./StructureTable";

const now = new Date("2026-01-02T00:00:00.000Z");

function makeRow(overrides: Partial<FlattenedStructureRow> = {}): FlattenedStructureRow {
  return {
    id: "site-1",
    name: "Plant A",
    level: AssetStructureLevel.SITE,
    description: "Main plant",
    path: "Acme / Plant A",
    assetCount: 3,
    updatedAt: now,
    ...overrides,
  };
}

describe("StructureTable", () => {
  it("renders an empty state when there are no rows", () => {
    render(<StructureTable rows={[]} />);

    expect(screen.getByText("No asset structure yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a row with name link, level, description, path, asset count, and updated date", () => {
    render(<StructureTable rows={[makeRow()]} />);

    expect(screen.getByRole("link", { name: "Plant A" })).toHaveAttribute(
      "href",
      "/asset-structure/site-1"
    );
    expect(screen.getByText("Site")).toBeInTheDocument();
    expect(screen.getByText("Main plant")).toBeInTheDocument();
    expect(screen.getByText("Acme / Plant A")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(now.toLocaleString())).toBeInTheDocument();
  });

  it("falls back to a dash for a missing description and empty path", () => {
    render(<StructureTable rows={[makeRow({ description: null, path: "" })]} />);

    const cells = screen.getAllByText("—");
    expect(cells).toHaveLength(2);
  });
});
