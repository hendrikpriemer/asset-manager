import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteVisionProviderButton } from "./DeleteVisionProviderButton";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("DeleteVisionProviderButton", () => {
  it("does not call the delete action when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const deleteVisionProviderAction = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<DeleteVisionProviderButton deleteVisionProviderAction={deleteVisionProviderAction} />);

    await user.click(screen.getByRole("button", { name: "Delete vision provider" }));

    expect(deleteVisionProviderAction).not.toHaveBeenCalled();
  });

  it("calls the delete action when confirmed, and disables while pending", async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    const deleteVisionProviderAction = vi.fn().mockReturnValue(promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<DeleteVisionProviderButton deleteVisionProviderAction={deleteVisionProviderAction} />);

    await user.click(screen.getByRole("button", { name: "Delete vision provider" }));

    expect(deleteVisionProviderAction).toHaveBeenCalledTimes(1);
    expect(window.confirm).toHaveBeenCalledWith(
      "Disable the vision-API fallback and remove the stored API key?"
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete vision provider" })).toBeDisabled()
    );

    resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete vision provider" })).not.toBeDisabled()
    );
  });
});
