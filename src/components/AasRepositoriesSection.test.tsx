import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AasRepositoriesSection } from "./AasRepositoriesSection";

const { deleteAasRepository, testAasRepositoryConnection } = vi.hoisted(() => ({
  deleteAasRepository: vi.fn(),
  testAasRepositoryConnection: vi.fn(() => new Promise(() => {})),
}));

vi.mock("@/lib/aas-repository-actions", () => ({
  deleteAasRepository,
  testAasRepositoryConnection,
}));

describe("AasRepositoriesSection", () => {
  it("links back to the central Settings page", () => {
    render(<AasRepositoriesSection repositories={[]} />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });

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
          {
            id: "repo-1",
            name: "WAGO",
            baseUrl: "https://c1.api.wago.com",
            isLocalMirror: false,
          },
          {
            id: "repo-2",
            name: "Local BaSyx",
            baseUrl: "http://basyx-aas-env:8081",
            isLocalMirror: true,
          },
        ]}
      />
    );

    expect(screen.getByText("WAGO")).toBeInTheDocument();
    expect(screen.getByText("https://c1.api.wago.com")).toBeInTheDocument();
    expect(screen.getByText("Local BaSyx")).toBeInTheDocument();
    expect(screen.getByText("http://basyx-aas-env:8081")).toBeInTheDocument();
    expect(screen.getByText("Local mirror")).toBeInTheDocument();
  });

  it("does not show the local mirror badge for repositories that are not the mirror", () => {
    render(
      <AasRepositoriesSection
        repositories={[
          {
            id: "repo-1",
            name: "WAGO",
            baseUrl: "https://c1.api.wago.com",
            isLocalMirror: false,
          },
        ]}
      />
    );

    expect(screen.queryByText("Local mirror")).not.toBeInTheDocument();
  });

  it("deletes a repository when confirmed", async () => {
    const user = userEvent.setup();
    deleteAasRepository.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AasRepositoriesSection
        repositories={[
          {
            id: "repo-1",
            name: "WAGO",
            baseUrl: "https://c1.api.wago.com",
            isLocalMirror: false,
          },
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
          {
            id: "repo-1",
            name: "WAGO",
            baseUrl: "https://c1.api.wago.com",
            isLocalMirror: false,
          },
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

  it("shows a connection status indicator for every repository", () => {
    render(
      <AasRepositoriesSection
        repositories={[
          {
            id: "repo-1",
            name: "WAGO",
            baseUrl: "https://c1.api.wago.com",
            isLocalMirror: false,
          },
        ]}
      />
    );

    expect(testAasRepositoryConnection).toHaveBeenCalledWith(
      "https://c1.api.wago.com"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
  });

  it("hides the Edit and Delete actions for the local mirror repository", () => {
    render(
      <AasRepositoriesSection
        repositories={[
          {
            id: "mirror-1",
            name: "Local AAS Mirror",
            baseUrl: "http://basyx-aas-env:8081",
            isLocalMirror: true,
          },
        ]}
      />
    );

    expect(
      screen.queryByRole("link", { name: "Edit Local AAS Mirror" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete Local AAS Mirror" })
    ).not.toBeInTheDocument();
  });
});
