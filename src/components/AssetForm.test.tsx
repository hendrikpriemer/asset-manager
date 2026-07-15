import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetForm } from "./AssetForm";
import type { ActionState } from "@/lib/actions";

describe("AssetForm", () => {
  it("renders empty fields when no initial values are given", () => {
    const action = vi.fn();

    render(<AssetForm action={action} submitLabel="Create" />);

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Create" })
    ).toBeInTheDocument();
  });

  it("prefills fields from initial values", () => {
    const action = vi.fn();

    render(
      <AssetForm
        action={action}
        submitLabel="Save"
        initialValues={{ name: "Laptop", description: "Work laptop" }}
      />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Laptop");
    expect(screen.getByLabelText("Description")).toHaveValue("Work laptop");
  });

  it("falls back to an empty description when initial description is null", () => {
    const action = vi.fn();

    render(
      <AssetForm
        action={action}
        submitLabel="Save"
        initialValues={{ name: "Laptop", description: null }}
      />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("submits the form data to the action", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: null });

    render(<AssetForm action={action} submitLabel="Create" />);

    await user.type(screen.getByLabelText("Name"), "Laptop");
    await user.type(screen.getByLabelText("Description"), "Work laptop");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const [, formData] = action.mock.calls[0];
    expect(formData.get("name")).toBe("Laptop");
    expect(formData.get("description")).toBe("Work laptop");
  });

  it("displays the error returned by the action", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: "Name is required." });

    render(<AssetForm action={action} submitLabel="Create" />);

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name is required."
    );
  });
});
