import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionState } from "@/lib/aas-repository-actions";
import type { AasRepositoryConnectionResult } from "@/lib/aas-repository-actions";

const { createAasRepository, updateAasRepository, testAasRepositoryConnection } =
  vi.hoisted(() => ({
    createAasRepository:
      vi.fn<
        (prevState: ActionState, formData: FormData) => Promise<ActionState>
      >(),
    updateAasRepository:
      vi.fn<
        (
          id: string,
          prevState: ActionState,
          formData: FormData
        ) => Promise<ActionState>
      >(),
    testAasRepositoryConnection:
      vi.fn<(baseUrl: string) => Promise<AasRepositoryConnectionResult>>(),
  }));
const back = vi.fn();
const push = vi.fn();

vi.mock("@/lib/aas-repository-actions", () => ({
  createAasRepository,
  updateAasRepository,
  testAasRepositoryConnection,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

const { AasRepositoryWizard } = await import("./AasRepositoryWizard");

beforeEach(() => {
  vi.clearAllMocks();
  createAasRepository.mockResolvedValue({ error: null });
  updateAasRepository.mockResolvedValue({ error: null });
});

describe("AasRepositoryWizard (create mode)", () => {
  it("renders the name and base URL fields with Save disabled initially", () => {
    render(<AasRepositoryWizard mode="create" />);

    expect(screen.getByRole("heading", { name: "Add repository" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Base URL")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("disables Test connection until a base URL is entered", async () => {
    const user = userEvent.setup();
    render(<AasRepositoryWizard mode="create" />);

    expect(
      screen.getByRole("button", { name: "Test connection" })
    ).toBeDisabled();

    await user.type(screen.getByLabelText("Base URL"), "https://example.com");

    expect(
      screen.getByRole("button", { name: "Test connection" })
    ).toBeEnabled();
  });

  it("shows a spinner while testing, then a success message and enables Save", async () => {
    const user = userEvent.setup();
    let resolveTest!: (result: AasRepositoryConnectionResult) => void;
    testAasRepositoryConnection.mockImplementation(
      () => new Promise((resolve) => (resolveTest = resolve))
    );

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));

    expect(
      screen.getByRole("status", { name: "Checking connection" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    resolveTest({ status: "reachable" });

    expect(await screen.findByText("Connection successful.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(testAasRepositoryConnection).toHaveBeenCalledWith("https://example.com");
  });

  it("shows a failure message and keeps Save disabled when the connection test fails", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "unreachable" });

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));

    expect(
      await screen.findByText("Could not connect to this repository.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("resets the test result and disables Save again when the base URL is edited after a successful test", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    await user.type(screen.getByLabelText("Base URL"), "/more");

    expect(screen.queryByText("Connection successful.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("keeps Save disabled when the name is blank even after a successful test", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the repository with the entered name and base URL", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createAasRepository).toHaveBeenCalledTimes(1));
    const [, formData] = createAasRepository.mock.calls[0];
    expect(formData.get("name")).toBe("WAGO");
    expect(formData.get("baseUrl")).toBe("https://example.com");
    expect(updateAasRepository).not.toHaveBeenCalled();
  });

  it("shows Saving… while pending and navigates back on success", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });
    let resolveSave!: (state: ActionState) => void;
    createAasRepository.mockReturnValue(
      new Promise((resolve) => (resolveSave = resolve))
    );

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    resolveSave({ error: null });
    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });

  it("displays the error returned by createAasRepository and does not navigate away", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });
    createAasRepository.mockResolvedValue({
      error: "A repository with this base URL is already configured.",
    });

    render(<AasRepositoryWizard mode="create" />);
    await user.type(screen.getByLabelText("Name"), "WAGO");
    await user.type(screen.getByLabelText("Base URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A repository with this base URL is already configured."
    );
    expect(back).not.toHaveBeenCalled();
  });
});

describe("AasRepositoryWizard (edit mode)", () => {
  it("prefills the name and base URL fields from the given initial values", () => {
    render(
      <AasRepositoryWizard
        mode="edit"
        repositoryId="repo-1"
        initialName="WAGO"
        initialBaseUrl="https://c1.api.wago.com/smartdata-aas-env"
      />
    );

    expect(screen.getByRole("heading", { name: "Edit repository" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("WAGO");
    expect(screen.getByLabelText("Base URL")).toHaveValue(
      "https://c1.api.wago.com/smartdata-aas-env"
    );
  });

  it("still requires a fresh successful test before Save is enabled", () => {
    render(
      <AasRepositoryWizard
        mode="edit"
        repositoryId="repo-1"
        initialName="WAGO"
        initialBaseUrl="https://c1.api.wago.com/smartdata-aas-env"
      />
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves via updateAasRepository bound to the repository id", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(
      <AasRepositoryWizard
        mode="edit"
        repositoryId="repo-1"
        initialName="WAGO"
        initialBaseUrl="https://c1.api.wago.com/smartdata-aas-env"
      />
    );
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "WAGO (renamed)");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateAasRepository).toHaveBeenCalledTimes(1));
    const [id, , formData] = updateAasRepository.mock.calls[0];
    expect(id).toBe("repo-1");
    expect(formData.get("name")).toBe("WAGO (renamed)");
    expect(formData.get("baseUrl")).toBe("https://c1.api.wago.com/smartdata-aas-env");
    expect(createAasRepository).not.toHaveBeenCalled();
  });

  it("navigates back after a successful edit", async () => {
    const user = userEvent.setup();
    testAasRepositoryConnection.mockResolvedValue({ status: "reachable" });

    render(
      <AasRepositoryWizard
        mode="edit"
        repositoryId="repo-1"
        initialName="WAGO"
        initialBaseUrl="https://c1.api.wago.com/smartdata-aas-env"
      />
    );
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
  });
});
