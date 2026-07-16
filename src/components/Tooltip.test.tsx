import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders the trigger children", () => {
    render(
      <Tooltip label="Edit">
        <button>Trigger</button>
      </Tooltip>
    );

    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument();
  });

  it("renders the label in a tooltip role", () => {
    render(
      <Tooltip label="Edit">
        <button>Trigger</button>
      </Tooltip>
    );

    expect(screen.getByRole("tooltip")).toHaveTextContent("Edit");
  });
});
