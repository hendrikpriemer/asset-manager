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

  it("renders top-level properties with their values, defaulting a null value to an em dash", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            properties: [
              { idShort: "ManufacturerName", value: "WAGO" },
              { idShort: "YearOfConstruction", value: null },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("WAGO")).toBeInTheDocument();
    expect(screen.getByText("YearOfConstruction")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders a File with a value as a clickable link labeled with its contentType", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            files: [
              {
                idShort: "DigitalFile",
                value: "https://example.com/part.stp",
                contentType: "application/step",
              },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("DigitalFile")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "application/step" });
    expect(link).toHaveAttribute("href", "https://example.com/part.stp");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("labels a File link 'Download' when it has no contentType", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            files: [
              { idShort: "Unknown", value: "https://example.com/x", contentType: null },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("falls back to a File's idShort label when it is blank", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            files: [{ idShort: "", value: "https://example.com/x", contentType: null }],
          }),
        ])}
      />
    );

    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("shows a File without a value as plain text with its contentType, not a link", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            files: [
              { idShort: "Missing", value: null, contentType: "application/pdf" },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows an em dash for a valueless File with no contentType either", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            files: [{ idShort: "Missing", value: null, contentType: null }],
          }),
        ])}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders nested groups as folder-style section headers, using idShort when there is no displayName", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            groups: [
              {
                idShort: "GeneralInformation",
                displayName: null,
                properties: [{ idShort: "ManufacturerName", value: "WAGO" }],
                files: [],
                groups: [],
              },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("GeneralInformation")).toBeInTheDocument();
    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("WAGO")).toBeInTheDocument();
  });

  it("uses a group's displayName over its idShort for the section header", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            groups: [
              {
                idShort: "GeneralInformation",
                displayName: "General Information",
                properties: [],
                files: [],
                groups: [],
              },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.queryByText("GeneralInformation")).not.toBeInTheDocument();
  });

  it("renders multiple levels of nested groups", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({
            groups: [
              {
                idShort: "Outer",
                displayName: null,
                properties: [],
                files: [],
                groups: [
                  {
                    idShort: "Inner",
                    displayName: null,
                    properties: [{ idShort: "Leaf", value: "deep-value" }],
                    files: [],
                    groups: [],
                  },
                ],
              },
            ],
          }),
        ])}
      />
    );

    expect(screen.getByText("Outer")).toBeInTheDocument();
    expect(screen.getByText("Inner")).toBeInTheDocument();
    expect(screen.getByText("Leaf")).toBeInTheDocument();
    expect(screen.getByText("deep-value")).toBeInTheDocument();
  });
});
