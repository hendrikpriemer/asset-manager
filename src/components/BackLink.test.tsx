import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackLink } from "./BackLink";

describe("BackLink", () => {
  it("renders a link to the given href with the given label", () => {
    render(<BackLink href="/settings" label="Settings" />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });
});
