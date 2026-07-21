import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AasViewer } from "./AasViewer";
import type { AasData, AasSubmodelData } from "@/lib/aas";

function makeSubmodel(overrides: Partial<AasSubmodelData> = {}): AasSubmodelData {
  return {
    id: "sm-1",
    idShort: "Nameplate",
    displayName: null,
    description: null,
    templateName: null,
    version: null,
    properties: [],
    files: [],
    groups: [],
    ...overrides,
  };
}

function makeAasData(submodels: AasSubmodelData[]): AasData {
  return { id: "aas-1", idShort: "Shell", submodels };
}

describe("AasViewer", () => {
  it("shows a message when the AAS has no submodels", () => {
    render(<AasViewer aasData={makeAasData([])} />);

    expect(screen.getByText("This AAS has no submodels.")).toBeInTheDocument();
  });

  it("selects the first submodel by default and shows its title", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ id: "sm-1", idShort: "Nameplate" }),
          makeSubmodel({ id: "sm-2", idShort: "TechnicalData" }),
        ])}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Nameplate" })
    ).toBeInTheDocument();
  });

  it("lists every submodel with an SM badge", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ id: "sm-1", idShort: "Nameplate" }),
          makeSubmodel({ id: "sm-2", idShort: "TechnicalData" }),
        ])}
      />
    );

    expect(screen.getAllByText("SM")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: /Nameplate/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /TechnicalData/ })
    ).toBeInTheDocument();
  });

  it("switches the detail view when a different submodel is clicked", async () => {
    const user = userEvent.setup();
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ id: "sm-1", idShort: "Nameplate" }),
          makeSubmodel({ id: "sm-2", idShort: "TechnicalData" }),
        ])}
      />
    );

    await user.click(screen.getByRole("button", { name: /TechnicalData/ }));

    expect(
      screen.getByRole("heading", { name: "TechnicalData" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /TechnicalData/ })
    ).toHaveAttribute("aria-current", "true");
    expect(
      screen.getByRole("button", { name: /Nameplate/ })
    ).not.toHaveAttribute("aria-current");
  });

  it("prefers displayName over templateName and idShort for the title", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            idShort: "Nameplate",
            templateName: "Digital Nameplate for industrial equipment",
            displayName: "Custom Display Name",
          }),
        ])}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Custom Display Name" })
    ).toBeInTheDocument();
  });

  it("falls back to templateName when displayName is absent", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            idShort: "Nameplate",
            templateName: "Digital Nameplate for industrial equipment",
          }),
        ])}
      />
    );

    expect(
      screen.getByRole("heading", {
        name: "Digital Nameplate for industrial equipment",
      })
    ).toBeInTheDocument();
  });

  it("falls back to id when idShort is blank and there is no displayName/templateName", () => {
    render(
      <AasViewer
        aasData={makeAasData([makeSubmodel({ id: "sm-raw-id", idShort: "" })])}
      />
    );

    expect(
      screen.getByRole("heading", { name: "sm-raw-id" })
    ).toBeInTheDocument();
  });

  it("falls back to no selection when the previously selected submodel id no longer exists in fresh data", () => {
    const { rerender } = render(
      <AasViewer aasData={makeAasData([makeSubmodel({ id: "sm-1" })])} />
    );

    rerender(
      <AasViewer aasData={makeAasData([makeSubmodel({ id: "sm-2" })])} />
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("shows the version badge when set", () => {
    render(
      <AasViewer
        aasData={makeAasData([makeSubmodel({ version: "2.0" })])}
      />
    );

    expect(screen.getByText("v2.0")).toBeInTheDocument();
  });

  it("shows no version badge when unset", () => {
    render(<AasViewer aasData={makeAasData([makeSubmodel({ version: null })])} />);

    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
  });

  it("shows the submodel description when set", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ description: "Contains the nameplate information" }),
        ])}
      />
    );

    expect(
      screen.getByText("Contains the nameplate information")
    ).toBeInTheDocument();
  });

  describe("Overview/Technical toggle", () => {
    function makeNameplateSubmodel(
      overrides: Partial<AasSubmodelData> = {}
    ): AasSubmodelData {
      return makeSubmodel({
        templateName: "Digital Nameplate for industrial equipment",
        properties: [{ idShort: "ManufacturerName", value: "Acme Machine Works" }],
        ...overrides,
      });
    }

    it("does not show the toggle for a submodel without a recognized visualization", () => {
      render(<AasViewer aasData={makeAasData([makeSubmodel()])} />);

      expect(
        screen.queryByRole("button", { name: "Overview" })
      ).not.toBeInTheDocument();
    });

    it("shows the toggle for a recognized Nameplate submodel, defaulting to Overview", () => {
      render(<AasViewer aasData={makeAasData([makeNameplateSubmodel()])} />);

      expect(
        screen.getByRole("button", { name: "Overview" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "Technical" })
      ).toHaveAttribute("aria-pressed", "false");
      expect(screen.getByText("Manufacturer")).toBeInTheDocument();
      expect(screen.queryByText("ManufacturerName")).not.toBeInTheDocument();
    });

    it("switches to the generic technical table when Technical is clicked", async () => {
      const user = userEvent.setup();
      render(<AasViewer aasData={makeAasData([makeNameplateSubmodel()])} />);

      await user.click(screen.getByRole("button", { name: "Technical" }));

      expect(
        screen.getByRole("button", { name: "Technical" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
      expect(screen.queryByText("Manufacturer")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Overview" }));

      expect(
        screen.getByRole("button", { name: "Overview" })
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Manufacturer")).toBeInTheDocument();
    });

    it("resets to Overview when switching to a different submodel", async () => {
      const user = userEvent.setup();
      render(
        <AasViewer
          aasData={makeAasData([
            makeNameplateSubmodel({ id: "sm-1", displayName: "Nameplate 1" }),
            makeNameplateSubmodel({ id: "sm-2", displayName: "Nameplate 2" }),
          ])}
        />
      );

      await user.click(screen.getByRole("button", { name: "Technical" }));
      await user.click(screen.getByRole("button", { name: /Nameplate 2/ }));

      expect(
        screen.getByRole("button", { name: "Overview" })
      ).toHaveAttribute("aria-pressed", "true");
    });
  });
});
