import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mql = {
    matches: initialMatches,
    media: "(min-width: 1024px)",
    addEventListener: vi.fn(
      (_event: string, cb: (event: MediaQueryListEvent) => void) => {
        listeners.add(cb);
      }
    ),
    removeEventListener: vi.fn(
      (_event: string, cb: (event: MediaQueryListEvent) => void) => {
        listeners.delete(cb);
      }
    ),
  } as unknown as MediaQueryList;

  window.matchMedia = vi.fn().mockReturnValue(mql);

  return {
    mql,
    fireChange(matches: boolean) {
      act(() => {
        listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
      });
    },
  };
}

beforeEach(() => {
  usePathname.mockReturnValue("/");
});

describe("Sidebar", () => {
  it("renders all nav items", () => {
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(
      screen.getByRole("link", { name: /overview/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /asset manager/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Info" })).toHaveAttribute(
      "href",
      "/info/about"
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings/aas-repositories"
    );
  });

  it("uses the responsive default width when no manual override is set", () => {
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(screen.getByRole("navigation").className).toContain("w-16 lg:w-56");
  });

  it("marks Overview as the active link on /", () => {
    usePathname.mockReturnValue("/");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /overview/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: /asset manager/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Asset Manager as active for /asset-structure and nested paths", () => {
    usePathname.mockReturnValue("/asset-structure/some-node");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(
      screen.getByRole("link", { name: /asset manager/i })
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: /overview/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Asset Manager as active for /assets sub-paths too", () => {
    usePathname.mockReturnValue("/assets/new");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(
      screen.getByRole("link", { name: /asset manager/i })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks Info as active on any /info sub-page, not just /info/about", () => {
    usePathname.mockReturnValue("/info/eula");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Info" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: /overview/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("does not mark Info as active outside of /info", () => {
    usePathname.mockReturnValue("/assets");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Info" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("marks Settings as active on any /settings sub-page", () => {
    usePathname.mockReturnValue("/settings/aas-repositories");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: /overview/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("does not mark Settings as active outside of /settings", () => {
    usePathname.mockReturnValue("/assets");
    mockMatchMedia(true);

    render(<Sidebar />);

    expect(
      screen.getByRole("link", { name: "Settings" })
    ).not.toHaveAttribute("aria-current");
  });

  it("collapses when toggled while the auto state is expanded", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);
    render(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /toggle sidebar width/i })
    );

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("w-16");
    expect(nav.className).not.toContain("lg:w-56");
  });

  it("expands when toggled while the auto state is collapsed", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);
    render(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /toggle sidebar width/i })
    );

    expect(screen.getByRole("navigation").className).toContain("w-56");
  });

  it("toggles back to the opposite explicit state on a second click", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);
    render(<Sidebar />);
    const toggle = screen.getByRole("button", {
      name: /toggle sidebar width/i,
    });

    await user.click(toggle);
    expect(screen.getByRole("navigation").className).toContain("w-16");

    await user.click(toggle);
    expect(screen.getByRole("navigation").className).toContain("w-56");
  });

  it("resets the manual override to auto when the breakpoint changes", async () => {
    const user = userEvent.setup();
    const { fireChange } = mockMatchMedia(true);
    render(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /toggle sidebar width/i })
    );
    expect(screen.getByRole("navigation").className).not.toContain(
      "lg:w-56"
    );

    fireChange(false);

    expect(screen.getByRole("navigation").className).toContain("lg:w-56");
  });

  it("sets aria-expanded only once a manual override is active", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);
    render(<Sidebar />);
    const toggle = screen.getByRole("button", {
      name: /toggle sidebar width/i,
    });

    expect(toggle).not.toHaveAttribute("aria-expanded");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the menu icon and centers icons by default (auto, no override)", () => {
    mockMatchMedia(true);

    render(<Sidebar />);

    const toggle = screen.getByRole("button", {
      name: /toggle sidebar width/i,
    });
    expect(toggle.className).toContain("self-center lg:self-end");
    expect(screen.getByText("menu").parentElement).toHaveClass("lg:hidden");
    expect(screen.getByText("close").parentElement).toHaveClass(
      "hidden",
      "lg:inline-block"
    );
    expect(screen.getByRole("link", { name: /overview/i }).className).toContain(
      "justify-center lg:justify-start"
    );
  });

  it("shows the close icon top-right and left-aligns nav items once expanded", async () => {
    const user = userEvent.setup();
    mockMatchMedia(false);
    render(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /toggle sidebar width/i })
    );

    const toggle = screen.getByRole("button", {
      name: /toggle sidebar width/i,
    });
    expect(toggle.className).toContain("self-end");
    expect(screen.getByText("menu").parentElement).toHaveClass("hidden");
    expect(screen.getByText("close").parentElement).not.toHaveClass("hidden");
    expect(
      screen.getByRole("link", { name: /overview/i }).className
    ).toContain("justify-start");
  });

  it("shows the menu icon centered once explicitly collapsed", async () => {
    const user = userEvent.setup();
    mockMatchMedia(true);
    render(<Sidebar />);

    await user.click(
      screen.getByRole("button", { name: /toggle sidebar width/i })
    );

    const toggle = screen.getByRole("button", {
      name: /toggle sidebar width/i,
    });
    expect(toggle.className).toContain("self-center");
    expect(screen.getByText("menu").parentElement).not.toHaveClass("hidden");
    expect(screen.getByText("close").parentElement).toHaveClass("hidden");
    expect(
      screen.getByRole("link", { name: /overview/i }).className
    ).toContain("justify-center");
  });

  it("removes the matchMedia change listener on unmount", () => {
    const { mql } = mockMatchMedia(true);
    const { unmount } = render(<Sidebar />);

    unmount();

    expect(mql.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });
});
