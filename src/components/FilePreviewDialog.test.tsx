import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/Model3DViewer", () => ({
  Model3DViewer: ({ fileUrl, format }: { fileUrl: string; format: string }) => (
    <div data-testid="model-3d-viewer" data-file-url={fileUrl} data-format={format} />
  ),
}));

const { FilePreviewDialog } = await import("./FilePreviewDialog");

describe("FilePreviewDialog", () => {
  it("renders a PDF in an iframe", () => {
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/api/assets/asset-1/aas-files?submodelId=sm-1&fileIdShort=Manual&groupPath=%5B%5D"
        onClose={vi.fn()}
      />
    );

    const iframe = screen.getByTitle("Manual");
    expect(iframe.tagName).toBe("IFRAME");
    expect(iframe).toHaveAttribute(
      "src",
      "/api/assets/asset-1/aas-files?submodelId=sm-1&fileIdShort=Manual&groupPath=%5B%5D"
    );
  });

  it("renders the 3D viewer for a recognized 3D content type", () => {
    render(
      <FilePreviewDialog
        file={{ idShort: "Drawing", value: "https://vendor.example/drawing.stp", contentType: "application/step" }}
        fileUrl="/api/assets/asset-1/aas-files?submodelId=sm-1&fileIdShort=Drawing&groupPath=%5B%5D"
        onClose={vi.fn()}
      />
    );

    const viewer = screen.getByTestId("model-3d-viewer");
    expect(viewer).toHaveAttribute(
      "data-file-url",
      "/api/assets/asset-1/aas-files?submodelId=sm-1&fileIdShort=Drawing&groupPath=%5B%5D"
    );
    expect(viewer).toHaveAttribute("data-format", "step");
  });

  it("shows a fallback message for an unrecognized content type", () => {
    render(
      <FilePreviewDialog
        file={{ idShort: "Data", value: "https://vendor.example/data.csv", contentType: "text/csv" }}
        fileUrl="/api/assets/asset-1/aas-files?submodelId=sm-1&fileIdShort=Data&groupPath=%5B%5D"
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText("No preview available for this file type.")
    ).toBeInTheDocument();
  });

  it("falls back to a generic title when the file has no idShort", () => {
    render(
      <FilePreviewDialog
        file={{ idShort: "", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "File preview" })).toBeInTheDocument();
    expect(screen.getByTitle("PDF preview")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside the dialog panel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on a key press other than Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={onClose}
      />
    );

    await user.keyboard("{Enter}");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <FilePreviewDialog
        file={{ idShort: "Manual", value: "https://vendor.example/manual.pdf", contentType: "application/pdf" }}
        fileUrl="/proxy"
        onClose={onClose}
      />
    );

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
