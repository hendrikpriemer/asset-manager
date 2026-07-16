import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EulaSection } from "./EulaSection";

describe("EulaSection", () => {
  it("renders the heading and placeholder agreement text", () => {
    render(<EulaSection />);

    expect(
      screen.getByRole("heading", { name: "End user license agreement" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "ASSET MANAGER END USER LICENSE AGREEMENT",
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
  });
});
