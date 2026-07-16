import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders the icon name as text and hides it from the accessibility tree", () => {
    render(<Icon name="home" />);

    const icon = screen.getByText("home");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("material-symbols-outlined");
  });

  it("renders unfilled by default", () => {
    render(<Icon name="home" />);

    expect(screen.getByText("home")).toHaveStyle({
      fontVariationSettings: '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
    });
  });

  it("renders filled when filled is true", () => {
    render(<Icon name="home" filled />);

    expect(screen.getByText("home")).toHaveStyle({
      fontVariationSettings: '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24',
    });
  });

  it("merges an additional className", () => {
    render(<Icon name="home" className="text-2xl" />);

    expect(screen.getByText("home")).toHaveClass(
      "material-symbols-outlined",
      "text-2xl"
    );
  });
});
