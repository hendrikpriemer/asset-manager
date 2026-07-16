import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { OpenSourceLicense } from "@/lib/open-source-licenses";
import { OpenSourceLicensesSection } from "./OpenSourceLicensesSection";

const licenses: OpenSourceLicense[] = [
  { name: "next", version: "16.2.10", license: "MIT" },
  { name: "@prisma/client", version: "7.8.0", license: "Apache-2.0" },
];

describe("OpenSourceLicensesSection", () => {
  it("renders the heading and intro text", () => {
    render(<OpenSourceLicensesSection licenses={licenses} />);

    expect(
      screen.getByRole("heading", { name: "Open source licenses" })
    ).toBeInTheDocument();
    expect(screen.getByText(/open source community/)).toBeInTheDocument();
  });

  it("renders a table row per license entry", () => {
    render(<OpenSourceLicensesSection licenses={licenses} />);

    expect(screen.getByRole("cell", { name: "next" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "16.2.10" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "MIT" })).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: "@prisma/client" })
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Apache-2.0" })).toBeInTheDocument();
  });
});
