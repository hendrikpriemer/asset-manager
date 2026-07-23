import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AddVisionProviderSection } from "./AddVisionProviderSection";

vi.mock("@/lib/vision-provider-actions", () => ({
  saveVisionProviderSetting: vi.fn(),
  testVisionProviderConnection: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

describe("AddVisionProviderSection", () => {
  it("renders the create wizard with empty fields", () => {
    render(<AddVisionProviderSection />);

    expect(
      screen.getByRole("heading", { name: "Add vision provider" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Model")).toHaveValue("");
    expect(screen.getByLabelText("API key")).toHaveValue("");
  });
});
