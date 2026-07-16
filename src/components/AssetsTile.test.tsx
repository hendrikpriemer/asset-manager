import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssetsTile } from "./AssetsTile";

describe("AssetsTile", () => {
  it("links to /assets", () => {
    render(<AssetsTile count={5} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/assets");
  });

  it("shows the Assets label and the count", () => {
    render(<AssetsTile count={5} />);

    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows zero when there are no assets", () => {
    render(<AssetsTile count={0} />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
