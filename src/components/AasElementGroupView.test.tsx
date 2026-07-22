import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AasElementGroupView } from "./AasElementGroupView";
import type { AasElementGroup } from "@/lib/aas";

function makeGroup(overrides: Partial<AasElementGroup> = {}): AasElementGroup {
  return {
    idShort: "Group",
    displayName: null,
    properties: [],
    files: [],
    groups: [],
    ...overrides,
  };
}

describe("AasElementGroupView", () => {
  it("renders properties with their values, defaulting a null value to an em dash", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          properties: [
            { idShort: "ManufacturerName", value: "WAGO" },
            { idShort: "YearOfConstruction", value: null },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("WAGO")).toBeInTheDocument();
    expect(screen.getByText("YearOfConstruction")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders a File with a value as a clickable link labeled with its contentType", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            {
              idShort: "DigitalFile",
              value: "https://example.com/part.stp",
              contentType: "application/step",
            },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("DigitalFile")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "application/step" });
    expect(link).toHaveAttribute("href", "https://example.com/part.stp");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("labels a File link 'Download' when it has no contentType", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            { idShort: "Unknown", value: "https://example.com/x", contentType: null },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByRole("link", { name: "Download" })).toBeInTheDocument();
  });

  it("falls back to a File's idShort label when it is blank", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [{ idShort: "", value: "https://example.com/x", contentType: null }],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("shows a File without a value as plain text with its contentType, not a link", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            { idShort: "Missing", value: null, contentType: "application/pdf" },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows an em dash for a valueless File with no contentType either", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [{ idShort: "Missing", value: null, contentType: null }],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders nested groups as folder-style section headers, using idShort when there is no displayName", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          groups: [
            makeGroup({
              idShort: "GeneralInformation",
              properties: [{ idShort: "ManufacturerName", value: "WAGO" }],
            }),
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("GeneralInformation")).toBeInTheDocument();
    expect(screen.getByText("ManufacturerName")).toBeInTheDocument();
    expect(screen.getByText("WAGO")).toBeInTheDocument();
  });

  it("uses a group's displayName over its idShort for the section header", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          groups: [
            makeGroup({
              idShort: "GeneralInformation",
              displayName: "General Information",
            }),
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.queryByText("GeneralInformation")).not.toBeInTheDocument();
  });

  it("renders multiple levels of nested groups", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          groups: [
            makeGroup({
              idShort: "Outer",
              groups: [
                makeGroup({
                  idShort: "Inner",
                  properties: [{ idShort: "Leaf", value: "deep-value" }],
                }),
              ],
            }),
          ],
        })}
        depth={0}
      />
    );

    expect(screen.getByText("Outer")).toBeInTheDocument();
    expect(screen.getByText("Inner")).toBeInTheDocument();
    expect(screen.getByText("Leaf")).toBeInTheDocument();
    expect(screen.getByText("deep-value")).toBeInTheDocument();
  });

  it("shows a Preview button for a previewable content type and calls onPreview with the file and its group path", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const file = {
      idShort: "Drawing",
      value: "https://example.com/part.stp",
      contentType: "application/step",
    };

    render(
      <AasElementGroupView
        group={makeGroup({ files: [file] })}
        depth={0}
        groupPath={["Documents"]}
        onPreview={onPreview}
      />
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(onPreview).toHaveBeenCalledWith(file, ["Documents"]);
  });

  it("does not show a Preview button when onPreview is not provided", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            {
              idShort: "Drawing",
              value: "https://example.com/part.stp",
              contentType: "application/step",
            },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.queryByRole("button", { name: "Preview" })).not.toBeInTheDocument();
  });

  it("does not show a Preview button for a non-previewable content type", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            { idShort: "Data", value: "https://example.com/data.csv", contentType: "text/csv" },
          ],
        })}
        depth={0}
        onPreview={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Preview" })).not.toBeInTheDocument();
  });

  it("renders an inline image thumbnail for an image content type when getFileUrl is provided", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            {
              idShort: "ProductImage",
              value: "https://example.com/product.jpg",
              contentType: "image/jpeg",
            },
          ],
        })}
        depth={0}
        groupPath={["GeneralInformation"]}
        getFileUrl={(file, groupPath) =>
          `/proxy?file=${file.idShort}&path=${groupPath.join(",")}`
        }
      />
    );

    const image = screen.getByRole("img", { name: "ProductImage" });
    expect(image).toHaveAttribute(
      "src",
      "/proxy?file=ProductImage&path=GeneralInformation"
    );
    expect(screen.getByRole("link", { name: "image/jpeg" })).toHaveAttribute(
      "href",
      "https://example.com/product.jpg"
    );
  });

  it("falls back to 'Image' alt text for an image file with a blank idShort", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            { idShort: "", value: "https://example.com/product.jpg", contentType: "image/jpeg" },
          ],
        })}
        depth={0}
        getFileUrl={() => "/proxy"}
      />
    );

    expect(screen.getByRole("img", { name: "Image" })).toBeInTheDocument();
  });

  it("does not render an image thumbnail without getFileUrl", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            {
              idShort: "ProductImage",
              value: "https://example.com/product.jpg",
              contentType: "image/jpeg",
            },
          ],
        })}
        depth={0}
      />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not render an image thumbnail for a non-image content type", () => {
    render(
      <AasElementGroupView
        group={makeGroup({
          files: [
            {
              idShort: "Drawing",
              value: "https://example.com/part.stp",
              contentType: "application/step",
            },
          ],
        })}
        depth={0}
        getFileUrl={() => "/proxy"}
      />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("extends the group path with each nested group's idShort when calling onPreview", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();
    const file = {
      idShort: "Manual",
      value: "https://example.com/manual.pdf",
      contentType: "application/pdf",
    };

    render(
      <AasElementGroupView
        group={makeGroup({
          groups: [makeGroup({ idShort: "Documents", files: [file] })],
        })}
        depth={0}
        onPreview={onPreview}
      />
    );

    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(onPreview).toHaveBeenCalledWith(file, ["Documents"]);
  });
});
