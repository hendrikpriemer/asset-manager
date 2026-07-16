import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

const back = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

beforeEach(() => {
  back.mockClear();
});

describe("Modal", () => {
  it("renders children inside a dialog", () => {
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("focuses the dialog panel on mount", () => {
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("calls router.back() when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByRole("dialog").parentElement!);

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does not call router.back() when clicking inside the dialog content", async () => {
    const user = userEvent.setup();
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByText("Modal content"));

    expect(back).not.toHaveBeenCalled();
  });

  it("calls router.back() when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("calls router.back() when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    await user.keyboard("{Escape}");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("does not call router.back() for keys other than Escape", async () => {
    const user = userEvent.setup();
    render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    await user.keyboard("{Enter}");

    expect(back).not.toHaveBeenCalled();
  });

  it("removes the keydown listener on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <Modal>
        <p>Modal content</p>
      </Modal>
    );

    unmount();
    await user.keyboard("{Escape}");

    expect(back).not.toHaveBeenCalled();
  });
});
