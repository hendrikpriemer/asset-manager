import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyAssetStructureState } from "./EmptyAssetStructureState";

describe("EmptyAssetStructureState", () => {
  it("renders the heading, explanatory text, and create link", () => {
    render(<EmptyAssetStructureState />);

    expect(
      screen.getByRole("heading", { name: "No asset structure yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/organize your assets/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create asset structure" })
    ).toHaveAttribute("href", "/asset-structure/new");
  });
});
