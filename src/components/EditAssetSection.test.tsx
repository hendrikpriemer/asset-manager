import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditAssetSection } from "./EditAssetSection";

vi.mock("@/lib/actions", () => ({ updateAsset: vi.fn() }));

describe("EditAssetSection", () => {
  it("renders a heading and the form prefilled with the asset", () => {
    render(
      <EditAssetSection
        id="asset-1"
        asset={{ name: "Laptop", description: "Work laptop" }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Asset" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Laptop");
    expect(screen.getByLabelText("Description")).toHaveValue("Work laptop");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("falls back to an empty description when null", () => {
    render(
      <EditAssetSection id="asset-1" asset={{ name: "Laptop", description: null }} />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });
});
