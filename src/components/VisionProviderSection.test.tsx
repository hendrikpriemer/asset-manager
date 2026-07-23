import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VisionProviderSection } from "./VisionProviderSection";

const { deleteVisionProviderSetting } = vi.hoisted(() => ({
  deleteVisionProviderSetting: vi.fn(),
}));

vi.mock("@/lib/vision-provider-actions", () => ({
  deleteVisionProviderSetting,
}));

describe("VisionProviderSection", () => {
  it("links back to the central Settings page", () => {
    render(<VisionProviderSection existingSetting={null} />);

    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings"
    );
  });

  it("shows an empty state and an Add button when no provider is configured", () => {
    render(<VisionProviderSection existingSetting={null} />);

    expect(screen.getByText("No vision provider configured yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add vision provider" })).toHaveAttribute(
      "href",
      "/settings/vision-provider/new"
    );
  });

  it("lists the configured provider with its label and model", () => {
    render(
      <VisionProviderSection existingSetting={{ provider: "OPENAI", model: "gpt-5.6" }} />
    );

    expect(screen.getByText("ChatGPT (OpenAI)")).toBeInTheDocument();
    expect(screen.getByText("gpt-5.6")).toBeInTheDocument();
  });

  it("hides the Add button once a provider is configured", () => {
    render(
      <VisionProviderSection existingSetting={{ provider: "ANTHROPIC", model: "claude-sonnet-5" }} />
    );

    expect(
      screen.queryByRole("link", { name: "Add vision provider" })
    ).not.toBeInTheDocument();
  });

  it("links the Edit action to the edit route", () => {
    render(
      <VisionProviderSection existingSetting={{ provider: "ANTHROPIC", model: "claude-sonnet-5" }} />
    );

    expect(screen.getByRole("link", { name: "Edit vision provider" })).toHaveAttribute(
      "href",
      "/settings/vision-provider/edit"
    );
  });

  it("deletes the provider when confirmed", async () => {
    const user = userEvent.setup();
    deleteVisionProviderSetting.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <VisionProviderSection existingSetting={{ provider: "ANTHROPIC", model: "claude-sonnet-5" }} />
    );

    await user.click(screen.getByRole("button", { name: "Delete vision provider" }));

    expect(deleteVisionProviderSetting).toHaveBeenCalledTimes(1);
  });
});
