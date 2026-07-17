import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssetForm } from "./AssetForm";
import type { ActionState } from "@/lib/actions";
import type { StructureOption } from "@/lib/asset-structure";

const back = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

beforeEach(() => {
  back.mockClear();
  push.mockClear();
});

const structureOptions: StructureOption[] = [
  { id: "site-1", label: "Acme / Plant A" },
  { id: "equip-1", label: "Acme / Plant A / Lathe" },
];

describe("AssetForm", () => {
  it("renders empty fields when no initial values are given", () => {
    const action = vi.fn();

    render(
      <AssetForm action={action} submitLabel="Create" structureOptions={[]} />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Structure")).toHaveValue("");
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
        structureOptions={structureOptions}
        initialValues={{
          name: "Laptop",
          description: "Work laptop",
          structureNodeId: "equip-1",
        }}
      />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Laptop");
    expect(screen.getByLabelText("Description")).toHaveValue("Work laptop");
    expect(screen.getByLabelText("Structure")).toHaveValue("equip-1");
  });

  it("falls back to an empty description when initial description is null", () => {
    const action = vi.fn();

    render(
      <AssetForm
        action={action}
        submitLabel="Save"
        structureOptions={[]}
        initialValues={{ name: "Laptop", description: null }}
      />
    );

    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("lists Unassigned plus every structure option", () => {
    const action = vi.fn();

    render(
      <AssetForm
        action={action}
        submitLabel="Create"
        structureOptions={structureOptions}
      />
    );

    const select = screen.getByLabelText("Structure");
    const optionLabels = Array.from(select.querySelectorAll("option")).map(
      (option) => option.textContent
    );
    expect(optionLabels).toEqual([
      "Unassigned",
      "Acme / Plant A",
      "Acme / Plant A / Lathe",
    ]);
  });

  it("submits the form data to the action", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: null });

    render(
      <AssetForm
        action={action}
        submitLabel="Create"
        structureOptions={structureOptions}
      />
    );

    await user.type(screen.getByLabelText("Name"), "Laptop");
    await user.type(screen.getByLabelText("Description"), "Work laptop");
    await user.selectOptions(screen.getByLabelText("Structure"), "site-1");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const [, formData] = action.mock.calls[0];
    expect(formData.get("name")).toBe("Laptop");
    expect(formData.get("description")).toBe("Work laptop");
    expect(formData.get("structureNodeId")).toBe("site-1");
  });

  it("displays the error returned by the action", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: "Name is required." });

    render(
      <AssetForm action={action} submitLabel="Create" structureOptions={[]} />
    );

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Name is required."
    );
  });

  it("navigates back on success when no successHref is given", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: null });

    render(
      <AssetForm action={action} submitLabel="Create" structureOptions={[]} />
    );

    await user.type(screen.getByLabelText("Name"), "Laptop");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(push).not.toHaveBeenCalled();
  });

  it("pushes to successHref on success when given", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: null });

    render(
      <AssetForm
        action={action}
        submitLabel="Create"
        structureOptions={[]}
        successHref="/asset-structure/table"
      />
    );

    await user.type(screen.getByLabelText("Name"), "Laptop");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/asset-structure/table")
    );
    expect(back).not.toHaveBeenCalled();
  });

  it("does not navigate when the action returns an error", async () => {
    const user = userEvent.setup();
    const action = vi
      .fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>()
      .mockResolvedValue({ error: "Name is required." });

    render(
      <AssetForm action={action} submitLabel="Create" structureOptions={[]} />
    );

    await user.type(screen.getByLabelText("Name"), "   ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await screen.findByRole("alert");
    expect(back).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
