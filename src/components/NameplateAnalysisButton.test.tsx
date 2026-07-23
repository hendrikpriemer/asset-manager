import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NameplateAnalysisResult } from "@/lib/nameplate-generation-actions";

const { analyzeNameplatePhoto, linkAssetToMatchedAas, publishManualNameplate } = vi.hoisted(
  () => ({
    analyzeNameplatePhoto: vi.fn<(assetId: string) => Promise<NameplateAnalysisResult>>(),
    linkAssetToMatchedAas: vi.fn(),
    publishManualNameplate: vi.fn(),
  })
);
const refresh = vi.fn();

vi.mock("@/lib/nameplate-generation-actions", () => ({
  analyzeNameplatePhoto,
  linkAssetToMatchedAas,
  publishManualNameplate,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { NameplateAnalysisButton } = await import("./NameplateAnalysisButton");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NameplateAnalysisButton", () => {
  it("shows a loading spinner while the photo is being analyzed", async () => {
    const user = userEvent.setup();
    let resolveAnalysis!: (result: NameplateAnalysisResult) => void;
    analyzeNameplatePhoto.mockReturnValue(
      new Promise((resolve) => (resolveAnalysis = resolve))
    );

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

    expect(
      screen.getByRole("status", { name: "Analyzing nameplate photo" })
    ).toBeInTheDocument();
    expect(analyzeNameplatePhoto).toHaveBeenCalledWith("asset-1");

    resolveAnalysis({ status: "no-photo" });
    await waitFor(() =>
      expect(
        screen.queryByRole("status", { name: "Analyzing nameplate photo" })
      ).not.toBeInTheDocument()
    );
  });

  it("shows a message when the asset has no nameplate photo", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

    expect(
      await screen.findByText("This asset has no nameplate photo to analyze.")
    ).toBeInTheDocument();
  });

  describe("when a match is found", () => {
    function mockMatch(): void {
      analyzeNameplatePhoto.mockResolvedValue({
        status: "matched",
        globalAssetId: "https://wago.com/ids/assets/750-451",
        manufacturerName: "WAGO GmbH & Co. KG",
        productDesignation: "8AI RTD/ adj.",
      });
    }

    it("shows the resolved manufacturer/product preview", async () => {
      const user = userEvent.setup();
      mockMatch();

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

      expect(await screen.findByText("WAGO GmbH & Co. KG")).toBeInTheDocument();
      expect(screen.getByText("8AI RTD/ adj.")).toBeInTheDocument();
    });

    it("links the asset to the matched globalAssetId and refreshes on confirm", async () => {
      const user = userEvent.setup();
      mockMatch();
      linkAssetToMatchedAas.mockResolvedValue(undefined);

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
      await user.click(await screen.findByRole("button", { name: "Link asset to this product" }));

      expect(linkAssetToMatchedAas).toHaveBeenCalledWith(
        "asset-1",
        "https://wago.com/ids/assets/750-451"
      );
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows an em dash for a missing manufacturer/product preview field", async () => {
      const user = userEvent.setup();
      analyzeNameplatePhoto.mockResolvedValue({
        status: "matched",
        globalAssetId: "https://wago.com/ids/assets/750-451",
        manufacturerName: null,
        productDesignation: null,
      });

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

      expect(await screen.findAllByText("—")).toHaveLength(2);
    });
  });

  describe("when no match is found", () => {
    function mockNoMatch(): void {
      analyzeNameplatePhoto.mockResolvedValue({
        status: "no-match",
        manufacturerNameGuess: "WAGO",
        articleNumberGuess: "750-451",
        rawText: "ITEM-NO. 750-451",
        guessSource: "ocr",
      });
    }

    it("pre-fills the manufacturer and order code fields from the OCR guess", async () => {
      const user = userEvent.setup();
      mockNoMatch();

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

      expect(await screen.findByLabelText("Manufacturer")).toHaveValue("WAGO");
      expect(screen.getByLabelText("Order code")).toHaveValue("750-451");
      expect(screen.getByLabelText("Serial number")).toHaveValue("");
    });

    it("leaves the manufacturer and order code fields blank when the OCR guess found neither", async () => {
      const user = userEvent.setup();
      analyzeNameplatePhoto.mockResolvedValue({
        status: "no-match",
        manufacturerNameGuess: null,
        articleNumberGuess: null,
        rawText: "unreadable noise",
        guessSource: "ocr",
      });

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

      expect(await screen.findByLabelText("Manufacturer")).toHaveValue("");
      expect(screen.getByLabelText("Order code")).toHaveValue("");
    });

    it("shows the raw OCR text behind a details disclosure", async () => {
      const user = userEvent.setup();
      mockNoMatch();

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));

      expect(await screen.findByText("ITEM-NO. 750-451")).toBeInTheDocument();
    });

    it("publishes the edited fields, converting blank inputs to null, then refreshes and closes", async () => {
      const user = userEvent.setup();
      mockNoMatch();
      publishManualNameplate.mockResolvedValue({ error: null });

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
      await screen.findByLabelText("Manufacturer");
      await user.type(screen.getByLabelText("Serial number"), "  1004447940  ");
      await user.click(
        screen.getByRole("button", { name: "Publish as this asset's Nameplate" })
      );

      expect(publishManualNameplate).toHaveBeenCalledWith("asset-1", {
        manufacturerName: "WAGO",
        productDesignation: null,
        orderCode: "750-451",
        serialNumber: "1004447940",
        yearOfConstruction: null,
        street: null,
        zipcode: null,
        cityTown: null,
        nationalCode: null,
      });
      await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("publishes every edited field", async () => {
      const user = userEvent.setup();
      mockNoMatch();
      publishManualNameplate.mockResolvedValue({ error: null });

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
      await screen.findByLabelText("Manufacturer");

      await user.clear(screen.getByLabelText("Manufacturer"));
      await user.type(screen.getByLabelText("Manufacturer"), "WAGO");
      await user.type(screen.getByLabelText("Product designation"), "8AI RTD/ adj.");
      await user.clear(screen.getByLabelText("Order code"));
      await user.type(screen.getByLabelText("Order code"), "750-451");
      await user.type(screen.getByLabelText("Serial number"), "1004557901");
      await user.type(screen.getByLabelText("Year of construction"), "2024");
      await user.type(screen.getByLabelText("Street"), "Hansastr. 27");
      await user.type(screen.getByLabelText("Zip code"), "32423");
      await user.type(screen.getByLabelText("City/Town"), "Minden");
      await user.type(screen.getByLabelText("Country code"), "DE");
      await user.click(
        screen.getByRole("button", { name: "Publish as this asset's Nameplate" })
      );

      expect(publishManualNameplate).toHaveBeenCalledWith("asset-1", {
        manufacturerName: "WAGO",
        productDesignation: "8AI RTD/ adj.",
        orderCode: "750-451",
        serialNumber: "1004557901",
        yearOfConstruction: "2024",
        street: "Hansastr. 27",
        zipcode: "32423",
        cityTown: "Minden",
        nationalCode: "DE",
      });
    });

    it("shows an error and keeps the dialog open when publishing fails", async () => {
      const user = userEvent.setup();
      mockNoMatch();
      publishManualNameplate.mockResolvedValue({
        error: "Could not publish the Nameplate submodel to the local AAS mirror.",
      });

      render(<NameplateAnalysisButton assetId="asset-1" />);
      await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
      await screen.findByLabelText("Manufacturer");
      await user.click(
        screen.getByRole("button", { name: "Publish as this asset's Nameplate" })
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not publish the Nameplate submodel to the local AAS mirror."
      );
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
    await screen.findByText("This asset has no nameplate photo to analyze.");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
    await screen.findByText("This asset has no nameplate photo to analyze.");
    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close when clicking inside the dialog panel", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
    await screen.findByText("This asset has no nameplate photo to analyze.");
    await user.click(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
    await screen.findByText("This asset has no nameplate photo to analyze.");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not close on a key press other than Escape", async () => {
    const user = userEvent.setup();
    analyzeNameplatePhoto.mockResolvedValue({ status: "no-photo" });

    render(<NameplateAnalysisButton assetId="asset-1" />);
    await user.click(screen.getByRole("button", { name: "Analyze nameplate" }));
    await screen.findByText("This asset has no nameplate photo to analyze.");
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
