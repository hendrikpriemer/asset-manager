import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("exposes a status role labeled 'Loading' by default", () => {
    render(<Spinner />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<Spinner label="Checking connection" />);

    expect(
      screen.getByRole("status", { name: "Checking connection" })
    ).toBeInTheDocument();
  });

  it("renders a spinning, decorative icon", () => {
    render(<Spinner />);

    const icon = screen.getByText("progress_activity");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("animate-spin");
  });

  it("merges an additional className onto the icon", () => {
    render(<Spinner className="text-2xl" />);

    expect(screen.getByText("progress_activity")).toHaveClass(
      "animate-spin",
      "text-2xl"
    );
  });
});
