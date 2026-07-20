import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AasRepositoriesSection } from "./AasRepositoriesSection";
import type { ActionState } from "@/lib/aas-repository-actions";

const { createAasRepository, deleteAasRepository } = vi.hoisted(() => ({
  createAasRepository: vi.fn(),
  deleteAasRepository: vi.fn(),
}));

vi.mock("@/lib/aas-repository-actions", () => ({
  createAasRepository,
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

  it("submits the add-repository form to createAasRepository", async () => {
    const user = userEvent.setup();
    createAasRepository.mockResolvedValue({ error: null });

    render(<AasRepositoriesSection repositories={[]} />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://c1.api.wago.com");
    await user.click(screen.getByRole("button", { name: "Add repository" }));

    await waitFor(() => expect(createAasRepository).toHaveBeenCalledTimes(1));
    const [, formData] = createAasRepository.mock.calls[0];
    expect(formData.get("name")).toBe("WAGO");
    expect(formData.get("baseUrl")).toBe("https://c1.api.wago.com");
  });

  it("displays the error returned by createAasRepository", async () => {
    const user = userEvent.setup();
    createAasRepository.mockResolvedValue({
      error: "A repository with this base URL is already configured.",
    } satisfies ActionState);

    render(<AasRepositoriesSection repositories={[]} />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://c1.api.wago.com");
    await user.click(screen.getByRole("button", { name: "Add repository" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A repository with this base URL is already configured."
    );
  });
});
