import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditVisionProviderSection } from "./EditVisionProviderSection";

vi.mock("@/lib/vision-provider-actions", () => ({
  saveVisionProviderSetting: vi.fn(),
  testVisionProviderConnection: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

describe("EditVisionProviderSection", () => {
  it("renders the edit wizard prefilled with the provider and model", () => {
    render(<EditVisionProviderSection provider="ANTHROPIC" model="claude-sonnet-5" />);

    expect(
      screen.getByRole("heading", { name: "Edit vision provider" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Provider")).toHaveValue("ANTHROPIC");
    expect(screen.getByLabelText("Model")).toHaveValue("claude-sonnet-5");
  });
});
