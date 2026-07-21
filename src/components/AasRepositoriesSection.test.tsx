import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AasRepositoriesSection } from "./AasRepositoriesSection";

const { deleteAasRepository } = vi.hoisted(() => ({
  deleteAasRepository: vi.fn(),
}));

vi.mock("@/lib/aas-repository-actions", () => ({
  deleteAasRepository,
}));

describe("AasRepositoriesSection", () => {
  it("shows an empty state when no repositories are configured", () => {
    render(<AasRepositoriesSection repositories={[]} />);

    expect(
      screen.getByText("No repositories configured yet.")
    ).toBeInTheDocument();
  });

  it("lists configured repositories with their name and base URL", () => {
    render(
      <AasRepositoriesSection
        repositories={[
          { id: "repo-1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
          { id: "repo-2", name: "Local BaSyx", baseUrl: "http://basyx-aas-env:8081" },
        ]}
      />
    );

    expect(screen.getByText("WAGO")).toBeInTheDocument();
    expect(screen.getByText("https://c1.api.wago.com")).toBeInTheDocument();
    expect(screen.getByText("Local BaSyx")).toBeInTheDocument();
    expect(screen.getByText("http://basyx-aas-env:8081")).toBeInTheDocument();
  });

  it("deletes a repository when confirmed", async () => {
    const user = userEvent.setup();
    deleteAasRepository.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AasRepositoriesSection
        repositories={[
          { id: "repo-1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
        ]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete WAGO" }));

    expect(deleteAasRepository).toHaveBeenCalledWith("repo-1");
  });

  it("links each repository's Edit action to its edit route", () => {
    render(
      <AasRepositoriesSection
        repositories={[
          { id: "repo-1", name: "WAGO", baseUrl: "https://c1.api.wago.com" },
        ]}
      />
    );

    expect(screen.getByRole("link", { name: "Edit WAGO" })).toHaveAttribute(
      "href",
      "/settings/aas-repositories/edit/repo-1"
    );
  });

  it("links Add repository to the add-repository route", () => {
    render(<AasRepositoriesSection repositories={[]} />);

    expect(screen.getByRole("link", { name: "Add repository" })).toHaveAttribute(
      "href",
      "/settings/aas-repositories/new"
    );
  });
});
