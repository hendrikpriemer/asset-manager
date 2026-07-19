import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyAssetsState } from "./EmptyAssetsState";

describe("EmptyAssetsState", () => {
  it("renders the heading, explanatory text, and create link", () => {
    render(<EmptyAssetsState />);

    expect(
      screen.getByRole("heading", { name: "No assets yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/start tracking it/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New asset" })).toHaveAttribute(
      "href",
      "/assets/new"
    );
  });
});
