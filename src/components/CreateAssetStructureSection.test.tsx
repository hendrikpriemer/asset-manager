import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateAssetStructureSection } from "./CreateAssetStructureSection";
import type { ActionState } from "@/lib/asset-structure-actions";

const { createAssetStructureRoot } = vi.hoisted(() => ({
  createAssetStructureRoot: vi.fn(),
}));

vi.mock("@/lib/asset-structure-actions", () => ({ createAssetStructureRoot }));

describe("CreateAssetStructureSection", () => {
  it("renders empty fields and a heading", () => {
    render(<CreateAssetStructureSection />);

    expect(
      screen.getByRole("heading", { name: "Create asset structure" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
  });

  it("submits the form data to createAssetStructureRoot", async () => {
    const user = userEvent.setup();
    createAssetStructureRoot.mockResolvedValue({ error: null });

    render(<CreateAssetStructureSection />);
    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.type(screen.getByLabelText("Description"), "HQ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(createAssetStructureRoot).toHaveBeenCalledTimes(1)
    );
    const [, formData] = createAssetStructureRoot.mock.calls[0];
    expect(formData.get("name")).toBe("Acme");
    expect(formData.get("description")).toBe("HQ");
  });

  it("displays the error returned by the action", async () => {
    const user = userEvent.setup();
    createAssetStructureRoot.mockResolvedValue({
      error: "An asset structure already exists.",
    } satisfies ActionState);

    render(<CreateAssetStructureSection />);
    await user.type(screen.getByLabelText("Name"), "Acme");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An asset structure already exists."
    );
  });
});
