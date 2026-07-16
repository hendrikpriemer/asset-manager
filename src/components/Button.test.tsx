import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders as a filled primary button by default", () => {
    render(<Button>Create</Button>);

    const button = screen.getByRole("button", { name: "Create" });
    expect(button).toHaveClass("bg-primary", "text-on-primary");
  });

  it("renders the text variant", () => {
    render(<Button variant="text">Cancel</Button>);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
      "text-primary"
    );
  });

  it("renders the icon variant", () => {
    render(<Button variant="icon">×</Button>);

    expect(screen.getByRole("button", { name: "×" })).toHaveClass(
      "inline-flex"
    );
  });

  it("applies the error color role", () => {
    render(
      <Button variant="text" color="error">
        Delete
      </Button>
    );

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "text-error"
    );
  });

  it("merges an additional className", () => {
    render(<Button className="w-full">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "w-full"
    );
  });

  it("forwards native button props", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button type="button" onClick={onClick} disabled={false}>
        Click me
      </Button>
    );

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Saving…</Button>);

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
