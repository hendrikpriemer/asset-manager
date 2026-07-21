import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AasNameplateData } from "@/lib/aas-nameplate";

const { lookupNameplateCoordinates } = vi.hoisted(() => ({
  lookupNameplateCoordinates: vi.fn(),
}));

vi.mock("@/lib/aas-actions", () => ({ lookupNameplateCoordinates }));
vi.mock("@/components/NameplateMap", () => ({
  NameplateMap: ({ lat, lon }: { lat: number; lon: number }) => (
    <div data-testid="nameplate-map" data-lat={lat} data-lon={lon} />
  ),
}));

const { NameplateVisualization } = await import("./NameplateVisualization");

function makeNameplate(overrides: Partial<AasNameplateData> = {}): AasNameplateData {
  return {
    productProperties: [],
    versions: [],
    manufacturerName: null,
    companyLogo: null,
    address: null,
    phone: null,
    fax: null,
    email: null,
    vCard: null,
    markings: [],
    assetSpecificProperties: null,
    ...overrides,
  };
}

beforeEach(() => {
  lookupNameplateCoordinates.mockResolvedValue(null);
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:vcard-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NameplateVisualization", () => {
  describe("Product card", () => {
    it("renders nothing when there are no product properties or versions", () => {
      render(<NameplateVisualization nameplate={makeNameplate()} />);

      expect(screen.queryByText("Product")).not.toBeInTheDocument();
    });

    it("renders product properties and links a URIOfTheProduct that looks like a URL", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            productProperties: [
              { idShort: "URIOfTheProduct", value: "https://example.com/product" },
              { idShort: "SerialNumber", value: "SN-1" },
            ],
          })}
        />
      );

      expect(screen.getByText("Product")).toBeInTheDocument();
      const link = screen.getByRole("link", { name: "https://example.com/product" });
      expect(link).toHaveAttribute("href", "https://example.com/product");
      expect(screen.getByText("SN-1")).toBeInTheDocument();
    });

    it("renders a URIOfTheProduct that isn't a URL as plain text", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            productProperties: [{ idShort: "URIOfTheProduct", value: "not-a-url" }],
          })}
        />
      );

      expect(screen.getByText("not-a-url")).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("renders hardware/firmware/software versions as chips in a Versions row", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            versions: [
              { idShort: "HardwareVersion", value: "1.0" },
              { idShort: "SoftwareVersion", value: "2.1" },
            ],
          })}
        />
      );

      expect(screen.getByText("Versions")).toBeInTheDocument();
      expect(screen.getByText("HardwareVersion: 1.0")).toBeInTheDocument();
      expect(screen.getByText("SoftwareVersion: 2.1")).toBeInTheDocument();
    });
  });

  describe("Manufacturer card", () => {
    it("renders nothing when there is no manufacturer content at all", () => {
      render(<NameplateVisualization nameplate={makeNameplate()} />);

      expect(screen.queryByText("Manufacturer")).not.toBeInTheDocument();
    });

    it("renders the company logo image when the contentType is an image type", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            manufacturerName: "Acme",
            companyLogo: {
              idShort: "CompanyLogo",
              value: "https://example.com/logo.png",
              contentType: "image/png",
            },
          })}
        />
      );

      expect(screen.getByRole("img", { name: "Acme" })).toHaveAttribute(
        "src",
        "https://example.com/logo.png"
      );
    });

    it("falls back to a generic alt text for the logo when there is no manufacturer name", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            companyLogo: {
              idShort: "CompanyLogo",
              value: "https://example.com/logo.png",
              contentType: "image/png",
            },
          })}
        />
      );

      expect(screen.getByRole("img", { name: "Company logo" })).toHaveAttribute(
        "src",
        "https://example.com/logo.png"
      );
    });

    it("does not render a logo image when the contentType isn't an image type", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            manufacturerName: "Acme",
            companyLogo: {
              idShort: "CompanyLogo",
              value: "https://example.com/logo",
              contentType: "application/octet-stream",
            },
          })}
        />
      );

      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("Acme")).toBeInTheDocument();
    });

    it("renders phone, fax and email with their type badges when set", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            phone: { value: "+49 123 456", type: "Office" },
            fax: { value: "+49 123 457", type: "Home" },
            email: { value: "info@example.com", type: "Secretary" },
          })}
        />
      );

      expect(screen.getByText("Office")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "+49 123 456" })).toHaveAttribute(
        "href",
        "tel:+49123456"
      );
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("+49 123 457")).toBeInTheDocument();
      expect(screen.getByText("Secretary")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "info@example.com" })).toHaveAttribute(
        "href",
        "mailto:info@example.com"
      );
    });

    it("renders phone, fax and email without a badge when they have no type", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            phone: { value: "+49 123 456", type: null },
            fax: { value: "+49 123 457", type: null },
            email: { value: "info@example.com", type: null },
          })}
        />
      );

      expect(screen.getByRole("link", { name: "+49 123 456" })).toBeInTheDocument();
      expect(screen.getByText("+49 123 457")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "info@example.com" })).toBeInTheDocument();
    });

    it("does not render a Download Contact button when there is no vCard", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({ manufacturerName: "Acme" })}
        />
      );

      expect(
        screen.queryByRole("button", { name: /Download Contact/ })
      ).not.toBeInTheDocument();
    });

    it("downloads a vCard file when Download Contact is clicked", async () => {
      const user = userEvent.setup();
      const clickSpy = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === "a") {
          element.click = clickSpy;
        }
        return element;
      });

      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            manufacturerName: "Acme",
            vCard: "BEGIN:VCARD\nVERSION:3.0\nFN:Acme\nEND:VCARD",
          })}
        />
      );

      await user.click(screen.getByRole("button", { name: /Download Contact/ }));

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:vcard-url");
    });

    it("falls back to a generic filename when there is no manufacturer name", async () => {
      const user = userEvent.setup();
      let downloadedFilename: string | undefined;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === "a") {
          const anchor = element as HTMLAnchorElement;
          anchor.click = () => {
            downloadedFilename = anchor.download;
          };
        }
        return element;
      });

      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            vCard: "BEGIN:VCARD\nVERSION:3.0\nFN:Acme\nEND:VCARD",
          })}
        />
      );

      await user.click(screen.getByRole("button", { name: /Download Contact/ }));

      expect(downloadedFilename).toBe("contact.vcf");
    });
  });

  describe("Map section", () => {
    it("shows nothing map-related when there is no address", () => {
      render(<NameplateVisualization nameplate={makeNameplate()} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nameplate-map")).not.toBeInTheDocument();
    });

    it("shows a spinner while locating the manufacturer, then the map once resolved", async () => {
      let resolveLookup!: (coords: { lat: number; lon: number } | null) => void;
      lookupNameplateCoordinates.mockImplementation(
        () => new Promise((resolve) => (resolveLookup = resolve))
      );

      render(
        <NameplateVisualization
          nameplate={makeNameplate({ address: "Hansastr. 27, Minden, Germany" })}
        />
      );

      expect(
        screen.getByRole("status", { name: "Locating manufacturer" })
      ).toBeInTheDocument();

      resolveLookup({ lat: 52.2907, lon: 8.9126 });

      const map = await screen.findByTestId("nameplate-map");
      expect(map).toHaveAttribute("data-lat", "52.2907");
      expect(map).toHaveAttribute("data-lon", "8.9126");
      expect(
        screen.queryByRole("status", { name: "Locating manufacturer" })
      ).not.toBeInTheDocument();
    });

    it("does not update state after the component unmounts before the lookup resolves", async () => {
      let resolveLookup!: (coords: { lat: number; lon: number } | null) => void;
      lookupNameplateCoordinates.mockImplementation(
        () => new Promise((resolve) => (resolveLookup = resolve))
      );

      const { unmount } = render(
        <NameplateVisualization
          nameplate={makeNameplate({ address: "Hansastr. 27, Minden, Germany" })}
        />
      );

      unmount();
      resolveLookup({ lat: 52.2907, lon: 8.9126 });

      await vi.waitFor(() => expect(lookupNameplateCoordinates).toHaveBeenCalled());
    });

    it("shows nothing once the address could not be geocoded", async () => {
      lookupNameplateCoordinates.mockResolvedValue(null);

      render(
        <NameplateVisualization nameplate={makeNameplate({ address: "Nowhere" })} />
      );

      await vi.waitFor(() => {
        expect(
          screen.queryByRole("status", { name: "Locating manufacturer" })
        ).not.toBeInTheDocument();
      });
      expect(screen.queryByTestId("nameplate-map")).not.toBeInTheDocument();
    });
  });

  describe("Markings card", () => {
    it("renders nothing when there are no markings", () => {
      render(<NameplateVisualization nameplate={makeNameplate()} />);

      expect(screen.queryByText("Markings")).not.toBeInTheDocument();
    });

    it("renders a marking's image and name when the file has a value", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            markings: [
              {
                name: "CE",
                file: {
                  idShort: "MarkingFile",
                  value: "https://example.com/ce.png",
                  contentType: "image/png",
                },
              },
            ],
          })}
        />
      );

      expect(screen.getByRole("img", { name: "CE" })).toHaveAttribute(
        "src",
        "https://example.com/ce.png"
      );
      expect(screen.getByText("CE")).toBeInTheDocument();
    });

    it("renders a marking's name without an image when the file has no value", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            markings: [
              {
                name: "CE",
                file: { idShort: "MarkingFile", value: null, contentType: null },
              },
            ],
          })}
        />
      );

      expect(screen.getByText("CE")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("Asset Specific Properties card", () => {
    it("renders nothing when there is no AssetSpecificProperties group", () => {
      render(<NameplateVisualization nameplate={makeNameplate()} />);

      expect(screen.queryByText("Asset Specific Properties")).not.toBeInTheDocument();
    });

    it("renders nothing when the AssetSpecificProperties group is empty", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            assetSpecificProperties: {
              idShort: "AssetSpecificProperties",
              displayName: null,
              properties: [],
              files: [],
              groups: [],
            },
          })}
        />
      );

      expect(screen.queryByText("Asset Specific Properties")).not.toBeInTheDocument();
    });

    it("falls back to a default title when the group has no displayName", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            assetSpecificProperties: {
              idShort: "AssetSpecificProperties",
              displayName: null,
              properties: [{ idShort: "Custom", value: "value" }],
              files: [],
              groups: [],
            },
          })}
        />
      );

      expect(screen.getByText("Asset Specific Properties")).toBeInTheDocument();
      expect(screen.getByText("Custom")).toBeInTheDocument();
      expect(screen.getByText("value")).toBeInTheDocument();
    });

    it("uses the group's own displayName when present", () => {
      render(
        <NameplateVisualization
          nameplate={makeNameplate({
            assetSpecificProperties: {
              idShort: "AssetSpecificProperties",
              displayName: "Custom Properties",
              properties: [{ idShort: "Custom", value: "value" }],
              files: [],
              groups: [],
            },
          })}
        />
      );

      expect(screen.getByText("Custom Properties")).toBeInTheDocument();
    });
  });
});
