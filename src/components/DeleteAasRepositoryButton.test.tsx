import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAasRepositoryButton } from "./DeleteAasRepositoryButton";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("DeleteAasRepositoryButton", () => {
  it("does not call the delete action when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    const deleteAasRepositoryAction = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <DeleteAasRepositoryButton
        repositoryId="repo-1"
        repositoryName="WAGO"
        deleteAasRepositoryAction={deleteAasRepositoryAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete WAGO" }));

    expect(deleteAasRepositoryAction).not.toHaveBeenCalled();
  });

  it("calls the delete action with the repository id when confirmed, and disables while pending", async () => {
    const user = userEvent.setup();
    const { promise, resolve } = deferred<void>();
    const deleteAasRepositoryAction = vi.fn().mockReturnValue(promise);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <DeleteAasRepositoryButton
        repositoryId="repo-1"
        repositoryName="WAGO"
        deleteAasRepositoryAction={deleteAasRepositoryAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete WAGO" }));

    expect(deleteAasRepositoryAction).toHaveBeenCalledWith("repo-1");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Delete WAGO" })).toBeDisabled()
    );

    resolve();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete WAGO" })
      ).not.toBeDisabled()
    );
  });
});
