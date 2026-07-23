import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ActionState, VisionProviderConnectionResult } from "@/lib/vision-provider-actions";

const { saveVisionProviderSetting, deleteVisionProviderSetting, testVisionProviderConnection } =
  vi.hoisted(() => ({
    saveVisionProviderSetting:
      vi.fn<(prevState: ActionState, formData: FormData) => Promise<ActionState>>(),
    deleteVisionProviderSetting: vi.fn<() => Promise<void>>(),
    testVisionProviderConnection:
      vi.fn<
        (provider: string, model: string, apiKey: string) => Promise<VisionProviderConnectionResult>
      >(),
  }));
const refresh = vi.fn();

vi.mock("@/lib/vision-provider-actions", () => ({
  saveVisionProviderSetting,
  deleteVisionProviderSetting,
  testVisionProviderConnection,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { VisionProviderWizard } = await import("./VisionProviderWizard");

beforeEach(() => {
  vi.clearAllMocks();
  saveVisionProviderSetting.mockResolvedValue({ error: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("VisionProviderWizard (not yet configured)", () => {
  it("defaults to Claude, an empty model, and an empty key, with Save/Test disabled", () => {
    render(<VisionProviderWizard existingSetting={null} />);

    expect(screen.getByLabelText("Provider")).toHaveValue("ANTHROPIC");
    expect(screen.getByLabelText("Model")).toHaveValue("");
    expect(screen.getByLabelText("API key")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Test connection" })).toBeDisabled();
  });

  it("does not show a 'Disable vision fallback' button", () => {
    render(<VisionProviderWizard existingSetting={null} />);

    expect(
      screen.queryByRole("button", { name: "Disable vision fallback" })
    ).not.toBeInTheDocument();
  });

  it("requires both a model and an API key before Save/Test are enabled", async () => {
    const user = userEvent.setup();
    render(<VisionProviderWizard existingSetting={null} />);

    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Test connection" })).toBeEnabled();
  });

  it("shows a spinner while testing, then a success message", async () => {
    const user = userEvent.setup();
    let resolveTest!: (result: VisionProviderConnectionResult) => void;
    testVisionProviderConnection.mockReturnValue(
      new Promise((resolve) => (resolveTest = resolve))
    );

    render(<VisionProviderWizard existingSetting={null} />);
    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));

    expect(screen.getByRole("status", { name: "Checking connection" })).toBeInTheDocument();

    resolveTest({ status: "reachable" });

    expect(await screen.findByText("Connection successful.")).toBeInTheDocument();
    expect(testVisionProviderConnection).toHaveBeenCalledWith(
      "ANTHROPIC",
      "claude-sonnet-5",
      "sk-ant-test"
    );
  });

  it("shows a failure message when the connection test fails", async () => {
    const user = userEvent.setup();
    testVisionProviderConnection.mockResolvedValue({ status: "unreachable" });

    render(<VisionProviderWizard existingSetting={null} />);
    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));

    expect(
      await screen.findByText("Could not connect with this provider/model/key.")
    ).toBeInTheDocument();
  });

  it("resets the test result when the provider, model, or key changes", async () => {
    const user = userEvent.setup();
    testVisionProviderConnection.mockResolvedValue({ status: "reachable" });

    render(<VisionProviderWizard existingSetting={null} />);
    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: /Test connection/ }));
    await screen.findByText("Connection successful.");

    await user.selectOptions(screen.getByLabelText("Provider"), "OPENAI");

    expect(screen.queryByText("Connection successful.")).not.toBeInTheDocument();
  });

  it("saves the entered provider, model, and API key", async () => {
    const user = userEvent.setup();
    render(<VisionProviderWizard existingSetting={null} />);

    await user.selectOptions(screen.getByLabelText("Provider"), "OPENAI");
    await user.type(screen.getByLabelText("Model"), "gpt-5.6");
    await user.type(screen.getByLabelText("API key"), "sk-openai-test");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveVisionProviderSetting).toHaveBeenCalledTimes(1));
    const [, formData] = saveVisionProviderSetting.mock.calls[0];
    expect(formData.get("provider")).toBe("OPENAI");
    expect(formData.get("model")).toBe("gpt-5.6");
    expect(formData.get("apiKey")).toBe("sk-openai-test");
  });

  it("shows Saving… while pending, then clears the API key and refreshes on success", async () => {
    const user = userEvent.setup();
    let resolveSave!: (state: ActionState) => void;
    saveVisionProviderSetting.mockReturnValue(new Promise((resolve) => (resolveSave = resolve)));

    render(<VisionProviderWizard existingSetting={null} />);
    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();

    resolveSave({ error: null });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("API key")).toHaveValue("");
  });

  it("displays the error returned by saveVisionProviderSetting and does not refresh", async () => {
    const user = userEvent.setup();
    saveVisionProviderSetting.mockResolvedValue({ error: "API key is required." });

    render(<VisionProviderWizard existingSetting={null} />);
    await user.type(screen.getByLabelText("Model"), "claude-sonnet-5");
    await user.type(screen.getByLabelText("API key"), "sk-ant-test");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("API key is required.");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("VisionProviderWizard (already configured)", () => {
  const existingSetting = { provider: "ANTHROPIC" as const, model: "claude-sonnet-5" };

  it("prefills the provider and model, and enables Save/Test without entering a key", () => {
    render(<VisionProviderWizard existingSetting={existingSetting} />);

    expect(screen.getByLabelText("Provider")).toHaveValue("ANTHROPIC");
    expect(screen.getByLabelText("Model")).toHaveValue("claude-sonnet-5");
    expect(screen.getByLabelText("API key")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Test connection" })).toBeEnabled();
  });

  it("shows a 'Disable vision fallback' button", () => {
    render(<VisionProviderWizard existingSetting={existingSetting} />);

    expect(screen.getByRole("button", { name: "Disable vision fallback" })).toBeInTheDocument();
  });

  it("removes the setting and refreshes when the user confirms", async () => {
    const user = userEvent.setup();
    render(<VisionProviderWizard existingSetting={existingSetting} />);

    await user.click(screen.getByRole("button", { name: "Disable vision fallback" }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(deleteVisionProviderSetting).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the user cancels the confirmation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<VisionProviderWizard existingSetting={existingSetting} />);
    await user.click(screen.getByRole("button", { name: "Disable vision fallback" }));

    expect(deleteVisionProviderSetting).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("saves with a blank API key when the user doesn't change it", async () => {
    const user = userEvent.setup();
    render(<VisionProviderWizard existingSetting={existingSetting} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(saveVisionProviderSetting).toHaveBeenCalledTimes(1));
    const [, formData] = saveVisionProviderSetting.mock.calls[0];
    expect(formData.get("apiKey")).toBe("");
  });
});
