import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetStructureLevel } from "@/generated/prisma/client";
import type { StructureTreeNode } from "@/lib/asset-structure";
import { AssetStructureEditorSection } from "./AssetStructureEditorSection";
import { ToastProvider } from "./ToastProvider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
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
  children: [],
};

describe("AssetStructureEditorSection", () => {
  it("renders the heading, subtitle, and the tree editor", () => {
    render(
      <ToastProvider>
        <AssetStructureEditorSection tree={tree} />
      </ToastProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Edit asset structure" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/add and delete levels/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });
});
