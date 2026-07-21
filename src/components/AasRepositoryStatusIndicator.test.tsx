import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { AasRepositoryConnectionResult } from "@/lib/aas-repository-actions";

const { testAasRepositoryConnection } = vi.hoisted(() => ({
  testAasRepositoryConnection:
    vi.fn<(baseUrl: string) => Promise<AasRepositoryConnectionResult>>(),
}));

vi.mock("@/lib/aas-repository-actions", () => ({ testAasRepositoryConnection }));

const { AasRepositoryStatusIndicator } = await import(
  "./AasRepositoryStatusIndicator"
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AasRepositoryStatusIndicator", () => {
  it("shows Connecting… immediately, then Connected once the check resolves", async () => {
    let resolveCheck!: (result: AasRepositoryConnectionResult) => void;
    testAasRepositoryConnection.mockReturnValue(
      new Promise((resolve) => (resolveCheck = resolve))
    );

    render(<AasRepositoryStatusIndicator baseUrl="https://c1.api.wago.com" />);

    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");

    resolveCheck({ status: "reachable" });

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Connected")
    );
    expect(testAasRepositoryConnection).toHaveBeenCalledWith(
      "https://c1.api.wago.com"
    );
  });

  it("shows Not connected when the check resolves as unreachable", async () => {
    testAasRepositoryConnection.mockResolvedValue({ status: "unreachable" });

    render(<AasRepositoryStatusIndicator baseUrl="https://c1.api.wago.com" />);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Not connected")
    );
  });

  it("polls again automatically after 30 seconds", async () => {
    vi.useFakeTimers();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(<AasRepositoryStatusIndicator baseUrl="https://c1.api.wago.com" />);
    await vi.waitFor(() =>
      expect(testAasRepositoryConnection).toHaveBeenCalledTimes(1)
    );

    testAasRepositoryConnection.mockResolvedValue({ status: "unreachable" });
    await vi.advanceTimersByTimeAsync(30_000);

    expect(testAasRepositoryConnection).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Not connected");
  });

  it("re-checks when the baseUrl prop changes", async () => {
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    const { rerender } = render(
      <AasRepositoryStatusIndicator baseUrl="https://c1.api.wago.com" />
    );
    await waitFor(() =>
      expect(testAasRepositoryConnection).toHaveBeenCalledWith(
        "https://c1.api.wago.com"
      )
    );

    rerender(<AasRepositoryStatusIndicator baseUrl="https://other.example.com" />);

    await waitFor(() =>
      expect(testAasRepositoryConnection).toHaveBeenCalledWith(
        "https://other.example.com"
      )
    );
  });

  it("ignores a stale check result that resolves after the baseUrl has already changed", async () => {
    let resolveStale!: (result: AasRepositoryConnectionResult) => void;
    testAasRepositoryConnection.mockImplementationOnce(
      () => new Promise((resolve) => (resolveStale = resolve))
    );
    testAasRepositoryConnection.mockResolvedValueOnce({ status: "unreachable" });

    const { rerender } = render(
      <AasRepositoryStatusIndicator baseUrl="https://a.example.com" />
    );
    await waitFor(() =>
      expect(testAasRepositoryConnection).toHaveBeenCalledWith("https://a.example.com")
    );

    rerender(<AasRepositoryStatusIndicator baseUrl="https://b.example.com" />);
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Not connected")
    );

    resolveStale({ status: "reachable" });

    expect(screen.getByRole("status")).toHaveTextContent("Not connected");
  });
});
