import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddAasRepositorySection } from "./AddAasRepositorySection";

vi.mock("@/lib/aas-repository-actions", () => ({
  createAasRepository: vi.fn(),
  testAasRepositoryConnection: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("AddAasRepositorySection", () => {
  it("renders the create wizard with empty fields", () => {
    render(<AddAasRepositorySection />);

    expect(
      screen.getByRole("heading", { name: "Add repository" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
  });
});
