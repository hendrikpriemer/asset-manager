import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RefreshAasSearchIndexResult } from "@/lib/actions";

const { refreshAasSearchIndex } = vi.hoisted(() => ({
  refreshAasSearchIndex: vi.fn<
    (assetId: string) => Promise<RefreshAasSearchIndexResult>
  >(),
}));
const refresh = vi.fn();

vi.mock("@/lib/actions", () => ({ refreshAasSearchIndex }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const { RefreshAasSearchIndexButton } = await import(
  "./RefreshAasSearchIndexButton"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RefreshAasSearchIndexButton", () => {
  it("shows a spinner while refreshing, then refreshes the router on success", async () => {
    const user = userEvent.setup();
    let resolveRefresh!: (result: RefreshAasSearchIndexResult) => void;
    refreshAasSearchIndex.mockReturnValue(
      new Promise((resolve) => (resolveRefresh = resolve))
    );

    render(<RefreshAasSearchIndexButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: /Refresh search index/ }));

    expect(
      screen.getByRole("status", { name: "Refreshing search index" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refreshing…/ })).toBeDisabled();

    resolveRefresh({ error: null, mirrorWarning: null });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(refreshAasSearchIndex).toHaveBeenCalledWith("asset-1");
    expect(
      screen.queryByRole("status", { name: "Refreshing search index" })
    ).not.toBeInTheDocument();
  });

  it("shows an error and does not refresh the router when reindexing fails", async () => {
    const user = userEvent.setup();
    refreshAasSearchIndex.mockResolvedValue({
      error: "Could not reach the configured AAS repository.",
      mirrorWarning: null,
    });

    render(<RefreshAasSearchIndexButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: /Refresh search index/ }));

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent("Could not reach the configured AAS repository.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows a mirror warning alongside a successful refresh", async () => {
    const user = userEvent.setup();
    refreshAasSearchIndex.mockResolvedValue({
      error: null,
      mirrorWarning:
        "Search index updated, but mirroring to the local AAS repository failed.",
    });

    render(<RefreshAasSearchIndexButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: /Refresh search index/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Search index updated, but mirroring to the local AAS repository failed."
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("clears a previous error once a later refresh succeeds", async () => {
    const user = userEvent.setup();
    let resolveFirst!: (result: RefreshAasSearchIndexResult) => void;
    refreshAasSearchIndex.mockReturnValueOnce(
      new Promise((resolve) => (resolveFirst = resolve))
    );

    render(<RefreshAasSearchIndexButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: /Refresh search index/ }));
    resolveFirst({
      error: "This asset has no AAS reference to index.",
      mirrorWarning: null,
    });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Refresh search index" })
      ).toBeEnabled()
    );

    let resolveSecond!: (result: RefreshAasSearchIndexResult) => void;
    refreshAasSearchIndex.mockReturnValueOnce(
      new Promise((resolve) => (resolveSecond = resolve))
    );
    await user.click(screen.getByRole("button", { name: "Refresh search index" }));
    resolveSecond({ error: null, mirrorWarning: null });

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
