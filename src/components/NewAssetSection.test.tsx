import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NewAssetSection } from "./NewAssetSection";

vi.mock("@/lib/actions", () => ({ createAsset: vi.fn() }));

describe("NewAssetSection", () => {
  it("renders a heading and the create form", () => {
    render(<NewAssetSection />);

    expect(
      screen.getByRole("heading", { name: "New Asset" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });
});
