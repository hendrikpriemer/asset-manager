import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastProvider";

function TestConsumer() {
  const { showToast } = useToast();
  return (
    <>
      <button onClick={() => showToast("Saved.")}>Show success</button>
      <button onClick={() => showToast("Failed.", "error")}>Show error</button>
    </>
  );
}

function ConsumerOutsideProvider() {
  useToast();
  return null;
}

describe("ToastProvider / useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when useToast is used outside a ToastProvider", () => {
    expect(() => render(<ConsumerOutsideProvider />)).toThrow(
      "useToast must be used within a ToastProvider"
    );
  });

  it("shows a toast when showToast is called", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    });

    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("shows multiple toasts independently", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Show success" }));
      fireEvent.click(screen.getByRole("button", { name: "Show error" }));
    });

    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("auto-dismisses a toast after the timeout", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("dismisses a toast manually and clears its timer", () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears pending timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
