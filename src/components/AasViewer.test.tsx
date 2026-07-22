import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AasData, AasSubmodelData } from "@/lib/aas";

vi.mock("@/components/FilePreviewDialog", () => ({
  FilePreviewDialog: ({
    file,
    fileUrl,
    onClose,
  }: {
    file: { idShort: string };
    fileUrl: string;
    onClose: () => void;
  }) => (
    <div data-testid="file-preview-dialog" data-file-url={fileUrl} data-file-idshort={file.idShort}>
      <button type="button" onClick={onClose}>
        Close preview
      </button>
    </div>
  ),
}));

const { AasViewer } = await import("./AasViewer");

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
    render(<AasViewer aasData={makeAasData([])} assetId="asset-1" />);

    expect(screen.getByText("This AAS has no submodels.")).toBeInTheDocument();
  });

  it("selects the first submodel by default and shows its title", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ id: "sm-1", idShort: "Nameplate" }),
          makeSubmodel({ id: "sm-2", idShort: "TechnicalData" }),
        ])} assetId="asset-1" />
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
        ])} assetId="asset-1" />
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
        ])} assetId="asset-1" />
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
        ])} assetId="asset-1" />
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
        ])} assetId="asset-1" />
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
        aasData={makeAasData([makeSubmodel({ id: "sm-raw-id", idShort: "" })])} assetId="asset-1" />
    );

    expect(
      screen.getByRole("heading", { name: "sm-raw-id" })
    ).toBeInTheDocument();
  });

  it("falls back to no selection when the previously selected submodel id no longer exists in fresh data", () => {
    const { rerender } = render(
      <AasViewer aasData={makeAasData([makeSubmodel({ id: "sm-1" })])} assetId="asset-1" />
    );

    rerender(
      <AasViewer aasData={makeAasData([makeSubmodel({ id: "sm-2" })])} assetId="asset-1" />
    );

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("shows the version badge when set", () => {
    render(
      <AasViewer
        aasData={makeAasData([makeSubmodel({ version: "2.0" })])} assetId="asset-1" />
    );

    expect(screen.getByText("v2.0")).toBeInTheDocument();
  });

  it("shows no version badge when unset", () => {
    render(<AasViewer aasData={makeAasData([makeSubmodel({ version: null })])} assetId="asset-1" />);

    expect(screen.queryByText(/^v/)).not.toBeInTheDocument();
  });

  it("shows the submodel description when set", () => {
    render(
      <AasViewer
        aasData={makeAasData([
          makeSubmodel({ description: "Contains the nameplate information" }),
        ])} assetId="asset-1" />
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
      render(<AasViewer aasData={makeAasData([makeSubmodel()])} assetId="asset-1" />);

      expect(
        screen.queryByRole("button", { name: "Overview" })
      ).not.toBeInTheDocument();
    });

    it("shows the toggle for a recognized Nameplate submodel, defaulting to Overview", () => {
      render(<AasViewer aasData={makeAasData([makeNameplateSubmodel()])} assetId="asset-1" />);

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
      render(<AasViewer aasData={makeAasData([makeNameplateSubmodel()])} assetId="asset-1" />);

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
          ])} assetId="asset-1" />
      );

      await user.click(screen.getByRole("button", { name: "Technical" }));
      await user.click(screen.getByRole("button", { name: /Nameplate 2/ }));

      expect(
        screen.getByRole("button", { name: "Overview" })
      ).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("file preview", () => {
    it("opens the preview dialog with a proxy URL built from the asset, submodel, and file", async () => {
      const user = userEvent.setup();
      render(
        <AasViewer
          aasData={makeAasData([
            makeSubmodel({
              id: "sm-1",
              files: [
                {
                  idShort: "Drawing",
                  value: "https://vendor.example/drawing.stp",
                  contentType: "application/step",
                },
              ],
            }),
          ])}
          assetId="asset-1"
        />
      );

      await user.click(screen.getByRole("button", { name: "Preview" }));

      const dialog = screen.getByTestId("file-preview-dialog");
      expect(dialog).toHaveAttribute("data-file-idshort", "Drawing");
      const fileUrl = new URL(dialog.getAttribute("data-file-url") ?? "", "http://localhost");
      expect(fileUrl.pathname).toBe("/api/assets/asset-1/aas-files");
      expect(fileUrl.searchParams.get("submodelId")).toBe("sm-1");
      expect(fileUrl.searchParams.get("fileIdShort")).toBe("Drawing");
      expect(fileUrl.searchParams.get("groupPath")).toBe("[]");
    });

    it("includes the nested group path in the proxy URL", async () => {
      const user = userEvent.setup();
      render(
        <AasViewer
          aasData={makeAasData([
            makeSubmodel({
              id: "sm-1",
              groups: [
                {
                  idShort: "Documents",
                  displayName: null,
                  properties: [],
                  files: [
                    {
                      idShort: "Manual",
                      value: "https://vendor.example/manual.pdf",
                      contentType: "application/pdf",
                    },
                  ],
                  groups: [],
                },
              ],
            }),
          ])}
          assetId="asset-1"
        />
      );

      await user.click(screen.getByRole("button", { name: "Preview" }));

      const fileUrl = new URL(
        screen.getByTestId("file-preview-dialog").getAttribute("data-file-url") ?? "",
        "http://localhost"
      );
      expect(fileUrl.searchParams.get("groupPath")).toBe('["Documents"]');
    });

    it("closes the preview dialog when its onClose is called", async () => {
      const user = userEvent.setup();
      render(
        <AasViewer
          aasData={makeAasData([
            makeSubmodel({
              files: [
                {
                  idShort: "Manual",
                  value: "https://vendor.example/manual.pdf",
                  contentType: "application/pdf",
                },
              ],
            }),
          ])}
          assetId="asset-1"
        />
      );

      await user.click(screen.getByRole("button", { name: "Preview" }));
      expect(screen.getByTestId("file-preview-dialog")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Close preview" }));

      expect(screen.queryByTestId("file-preview-dialog")).not.toBeInTheDocument();
    });

    it("does not render the preview dialog until a file is previewed", () => {
      render(<AasViewer aasData={makeAasData([makeSubmodel()])} assetId="asset-1" />);

      expect(screen.queryByTestId("file-preview-dialog")).not.toBeInTheDocument();
    });

    it("renders an inline image thumbnail with a proxy URL built from the asset, submodel, and file", () => {
      render(
        <AasViewer
          aasData={makeAasData([
            makeSubmodel({
              id: "sm-1",
              files: [
                {
                  idShort: "ProductImage",
                  value: "https://vendor.example/product.jpg",
                  contentType: "image/jpeg",
                },
              ],
            }),
          ])}
          assetId="asset-1"
        />
      );

      const image = screen.getByRole("img", { name: "ProductImage" });
      const imageUrl = new URL(image.getAttribute("src") ?? "", "http://localhost");
      expect(imageUrl.pathname).toBe("/api/assets/asset-1/aas-files");
      expect(imageUrl.searchParams.get("submodelId")).toBe("sm-1");
      expect(imageUrl.searchParams.get("fileIdShort")).toBe("ProductImage");
      expect(imageUrl.searchParams.get("groupPath")).toBe("[]");
    });
  });
});
