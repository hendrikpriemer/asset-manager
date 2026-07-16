import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAssetButton } from "./DeleteAssetButton";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("DeleteAssetButton", () => {
  it("does not call the delete action when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const deleteAssetAction = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <DeleteAssetButton
        assetId="asset-1"
        assetName="Laptop"
        deleteAssetAction={deleteAssetAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete Laptop" }));

    expect(deleteAssetAction).not.toHaveBeenCalled();
  });

  it("calls the delete action with the asset id when confirmed, and disables while pending", async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    const deleteAssetAction = vi.fn().mockReturnValue(promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DeleteAssetButton
        assetId="asset-1"
        assetName="Laptop"
        deleteAssetAction={deleteAssetAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete Laptop" }));

    expect(deleteAssetAction).toHaveBeenCalledWith("asset-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete Laptop" })).toBeDisabled()
    );

    resolve();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete Laptop" })
      ).not.toBeDisabled()
    );
  });
});
