import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewAssetSection } from "./NewAssetSection";
import type { StructureOption } from "@/lib/asset-structure";

vi.mock("@/lib/actions", () => ({ createAsset: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

const structureOptions: StructureOption[] = [{ id: "site-1", label: "Plant A" }];

describe("NewAssetSection", () => {
  it("renders the create wizard with the given structure options", () => {
    render(
      <NewAssetSection
        structureOptions={structureOptions}
        successHref="/asset-structure/table"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Add new asset" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});
