import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoTabs } from "./InfoTabs";

const usePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("InfoTabs", () => {
  it("renders all three view links", () => {
    usePathname.mockReturnValue("/info/about");

    render(<InfoTabs />);

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/info/about"
    );
    expect(
      screen.getByRole("link", { name: "End User License Agreement" })
    ).toHaveAttribute("href", "/info/eula");
    expect(
      screen.getByRole("link", { name: "Open Source Licenses" })
    ).toHaveAttribute("href", "/info/licenses");
  });

  it("marks About as active on /info/about", () => {
    usePathname.mockReturnValue("/info/about");

    render(<InfoTabs />);

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      screen.getByRole("link", { name: "End User License Agreement" })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks End User License Agreement as active on /info/eula", () => {
    usePathname.mockReturnValue("/info/eula");

    render(<InfoTabs />);

    expect(
      screen.getByRole("link", { name: "End User License Agreement" })
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks Open Source Licenses as active on /info/licenses", () => {
    usePathname.mockReturnValue("/info/licenses");

    render(<InfoTabs />);

    expect(
      screen.getByRole("link", { name: "Open Source Licenses" })
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute(
      "aria-current"
    );
  });
});
