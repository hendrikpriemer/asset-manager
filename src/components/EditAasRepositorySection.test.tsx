import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditAasRepositorySection } from "./EditAasRepositorySection";

vi.mock("@/lib/aas-repository-actions", () => ({
  updateAasRepository: vi.fn(),
  testAasRepositoryConnection: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("EditAasRepositorySection", () => {
  it("renders the edit wizard prefilled with the repository's values", () => {
    render(
      <EditAasRepositorySection
        repositoryId="repo-1"
        name="WAGO"
        baseUrl="https://c1.api.wago.com/smartdata-aas-env"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Edit repository" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("WAGO");
    expect(screen.getByLabelText("Base URL")).toHaveValue(
      "https://c1.api.wago.com/smartdata-aas-env"
    );
  });
});
