import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditAssetSection } from "./EditAssetSection";

vi.mock("@/lib/actions", () => ({ updateAsset: vi.fn() }));

describe("EditAssetSection", () => {
  it("renders a heading and the form prefilled with the asset", () => {
    render(
      <EditAssetSection
        id="asset-1"
        asset={{ name: "Laptop", description: "Work laptop", structureNodeId: null }}
        structureOptions={[{ id: "site-1", label: "Plant A" }]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit Asset" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Laptop");
    expect(screen.getByLabelText("Description")).toHaveValue("Work laptop");
    expect(screen.getByLabelText("Structure")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("falls back to an empty description when null", () => {
    render(
      <EditAssetSection
        id="asset-1"
        asset={{ name: "Laptop", description: null, structureNodeId: null }}
        structureOptions={[]}
      />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("prefills the structure select from the assigned node", () => {
    render(
      <EditAssetSection
        id="asset-1"
        asset={{ name: "Laptop", description: null, structureNodeId: "site-1" }}
        structureOptions={[{ id: "site-1", label: "Plant A" }]}
      />
    );

    expect(screen.getByLabelText("Structure")).toHaveValue("site-1");
  });
});
