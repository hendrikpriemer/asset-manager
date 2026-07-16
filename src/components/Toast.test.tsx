import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders the message", () => {
    render(<Toast message="Saved." onDismiss={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("uses the success styling by default", () => {
    render(<Toast message="Saved." onDismiss={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveClass("bg-inverse-surface");
  });

  it("uses error styling when variant is error", () => {
    render(<Toast message="Failed." variant="error" onDismiss={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveClass("bg-error-container");
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Toast message="Saved." onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
