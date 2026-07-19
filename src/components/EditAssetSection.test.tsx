import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditAssetSection } from "./EditAssetSection";

vi.mock("@/lib/actions", () => ({ updateAsset: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("EditAssetSection", () => {
  it("renders the edit wizard prefilled with the asset's values", () => {
    render(
      <EditAssetSection
        id="asset-1"
        asset={{
          name: "Lathe",
          description: "Main lathe",
          structureNodeId: "site-1",
          assetImageType: null,
          nameplateImageType: null,
        }}
        structureOptions={[{ id: "site-1", label: "Plant A" }]}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit asset" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Lathe");
    expect(screen.getByLabelText("Description")).toHaveValue("Main lathe");
  });

  it("falls back to empty description and unassigned structure when null", async () => {
    const user = userEvent.setup();
    render(
      <EditAssetSection
        id="asset-1"
        asset={{
          name: "Lathe",
          description: null,
          structureNodeId: null,
          assetImageType: null,
          nameplateImageType: null,
        }}
        structureOptions={[{ id: "site-1", label: "Plant A" }]}
      />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
    await user.type(screen.getByLabelText("Description"), "Filled in now");
    await user.click(screen.getByRole("button", { name: "Next step" }));
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByLabelText("Structure")).toHaveValue("");
  });

  it("passes existing image URLs through when the asset has photos", async () => {
    const user = userEvent.setup();
    render(
      <EditAssetSection
        id="asset-1"
        asset={{
          name: "Lathe",
          description: "Main lathe",
          structureNodeId: null,
          assetImageType: "image/jpeg",
          nameplateImageType: "image/png",
        }}
        structureOptions={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.getByAltText("Asset photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/asset"
    );
    expect(screen.getByAltText("Nameplate photo")).toHaveAttribute(
      "src",
      "/api/assets/asset-1/images/nameplate"
    );
  });

  it("does not pass an image URL when the asset has no photos", async () => {
    const user = userEvent.setup();
    render(
      <EditAssetSection
        id="asset-1"
        asset={{
          name: "Lathe",
          description: "Main lathe",
          structureNodeId: null,
          assetImageType: null,
          nameplateImageType: null,
        }}
        structureOptions={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Next step" }));

    expect(screen.queryByAltText("Asset photo")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Nameplate photo")).not.toBeInTheDocument();
  });
});
