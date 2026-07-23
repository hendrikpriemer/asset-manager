import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
const { prisma } = vi.hoisted(() => ({
  prisma: {
    asset: { findUnique: vi.fn(), update: vi.fn() },
    aasRepository: { findMany: vi.fn() },
  },
}));
const { recognizeNameplateText } = vi.hoisted(() => ({
  recognizeNameplateText: vi.fn(),
}));
const { parseNameplateOcrText } = vi.hoisted(() => ({
  parseNameplateOcrText: vi.fn(),
}));
const { identifyAssetFromNameplate } = vi.hoisted(() => ({
  identifyAssetFromNameplate: vi.fn(),
}));
const { extractNameplateData } = vi.hoisted(() => ({
  extractNameplateData: vi.fn(),
}));
const { getDecryptedVisionProviderConfig } = vi.hoisted(() => ({
  getDecryptedVisionProviderConfig: vi.fn(),
}));
const { extractNameplateFieldsWithVision } = vi.hoisted(() => ({
  extractNameplateFieldsWithVision: vi.fn(),
}));
const { reindexAssetAas } = vi.hoisted(() => ({ reindexAssetAas: vi.fn() }));
const { mirrorAasDataToLocalRepo } = vi.hoisted(() => ({
  mirrorAasDataToLocalRepo: vi.fn(),
}));
const {
  buildAssetMetadataSubmodel,
  buildAssetNameplateSubmodel,
  buildAssetShell,
  publishAssetAas,
} = vi.hoisted(() => ({
  buildAssetMetadataSubmodel: vi.fn(() => ({ id: "metadata-submodel" })),
  buildAssetNameplateSubmodel: vi.fn(() => ({ id: "nameplate-submodel" })),
  buildAssetShell: vi.fn(() => ({ id: "shell" })),
  publishAssetAas: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/nameplate-ocr", () => ({ recognizeNameplateText }));
vi.mock("@/lib/nameplate-ocr-parse", () => ({ parseNameplateOcrText }));
vi.mock("@/lib/nameplate-identification", () => ({ identifyAssetFromNameplate }));
vi.mock("@/lib/aas-nameplate", () => ({ extractNameplateData }));
vi.mock("@/lib/vision-provider-settings", () => ({ getDecryptedVisionProviderConfig }));
vi.mock("@/lib/vision-providers/extract-nameplate-fields", () => ({
  extractNameplateFieldsWithVision,
}));
vi.mock("@/lib/aas-reindex", () => ({ reindexAssetAas }));
vi.mock("@/lib/aas-mirror", () => ({ mirrorAasDataToLocalRepo }));
vi.mock("@/lib/aas-publish", () => ({
  buildAssetMetadataSubmodel,
  buildAssetNameplateSubmodel,
  buildAssetShell,
  publishAssetAas,
}));

const { analyzeNameplatePhoto, linkAssetToMatchedAas, publishManualNameplate } = await import(
  "./nameplate-generation-actions"
);

beforeEach(() => {
  vi.clearAllMocks();
  getDecryptedVisionProviderConfig.mockResolvedValue(null);
});

describe("analyzeNameplatePhoto", () => {
  it("returns 'no-photo' when the asset has no nameplate image", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: null });

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toEqual({ status: "no-photo" });
  });

  it("returns 'no-photo' when the asset itself doesn't exist", async () => {
    prisma.asset.findUnique.mockResolvedValue(null);

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toEqual({ status: "no-photo" });
  });

  it("runs OCR + parsing against configured repository names and returns a match with a preview", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1, 2, 3]) });
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "WAGO" }]);
    recognizeNameplateText.mockResolvedValue("ITEM-NO. 750-451");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: "WAGO",
      articleNumber: "750-451",
      rawText: "ITEM-NO. 750-451",
    });
    const aasData = { id: "x", idShort: "750-451", submodels: [{ id: "sm-1" }] };
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://wago.com/ids/assets/750-451",
      aasData,
    });
    extractNameplateData.mockReturnValue({
      manufacturerName: "WAGO GmbH & Co. KG",
      productProperties: [
        { idShort: "ManufacturerProductDesignation", value: "8AI RTD/ adj." },
      ],
    });

    const result = await analyzeNameplatePhoto("asset-1");

    expect(recognizeNameplateText).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
    expect(parseNameplateOcrText).toHaveBeenCalledWith("ITEM-NO. 750-451", ["WAGO"]);
    expect(identifyAssetFromNameplate).toHaveBeenCalledWith("750-451");
    expect(result).toEqual({
      status: "matched",
      globalAssetId: "https://wago.com/ids/assets/750-451",
      manufacturerName: "WAGO GmbH & Co. KG",
      productDesignation: "8AI RTD/ adj.",
    });
  });

  it("previews a match with null manufacturer/product when none of its submodels are a recognized Nameplate", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("text");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: "750-451",
      rawText: "text",
    });
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://wago.com/ids/assets/750-451",
      aasData: { id: "x", idShort: "x", submodels: [{ id: "sm-1" }] },
    });
    extractNameplateData.mockReturnValue(null);

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toEqual({
      status: "matched",
      globalAssetId: "https://wago.com/ids/assets/750-451",
      manufacturerName: null,
      productDesignation: null,
    });
  });

  it("previews a match with a null product designation when the recognized Nameplate has none", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("text");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: "750-451",
      rawText: "text",
    });
    identifyAssetFromNameplate.mockResolvedValue({
      globalAssetId: "https://wago.com/ids/assets/750-451",
      aasData: { id: "x", idShort: "x", submodels: [{ id: "sm-1" }] },
    });
    extractNameplateData.mockReturnValue({
      manufacturerName: "WAGO GmbH & Co. KG",
      productProperties: [],
    });

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toMatchObject({ productDesignation: null });
  });

  it("returns 'no-match' with the OCR guess and raw text when no repository resolves and no vision provider is configured", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([{ name: "WAGO" }]);
    recognizeNameplateText.mockResolvedValue("noisy ocr output");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: null,
      rawText: "noisy ocr output",
    });
    identifyAssetFromNameplate.mockResolvedValue(null);

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toEqual({
      status: "no-match",
      manufacturerNameGuess: null,
      articleNumberGuess: null,
      rawText: "noisy ocr output",
      guessSource: "ocr",
    });
    expect(extractNameplateFieldsWithVision).not.toHaveBeenCalled();
  });

  it("does not consult the vision provider when OCR already found an article number", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("ITEM-NO. 750-451");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: "750-451",
      rawText: "ITEM-NO. 750-451",
    });
    identifyAssetFromNameplate.mockResolvedValue(null);

    await analyzeNameplatePhoto("asset-1");

    expect(getDecryptedVisionProviderConfig).not.toHaveBeenCalled();
    expect(extractNameplateFieldsWithVision).not.toHaveBeenCalled();
  });

  it("falls back to the configured vision provider when OCR found no article number, and uses its guess", async () => {
    prisma.asset.findUnique.mockResolvedValue({
      nameplateImage: new Uint8Array([1]),
      nameplateImageType: "image/png",
    });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("unreadable noise");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: null,
      rawText: "unreadable noise",
    });
    const visionConfig = { provider: "ANTHROPIC" as const, model: "claude-sonnet-5", apiKey: "key" };
    getDecryptedVisionProviderConfig.mockResolvedValue(visionConfig);
    extractNameplateFieldsWithVision.mockResolvedValue({
      manufacturerName: "WAGO",
      articleNumber: "750-451",
    });
    identifyAssetFromNameplate.mockResolvedValue(null);

    const result = await analyzeNameplatePhoto("asset-1");

    expect(extractNameplateFieldsWithVision).toHaveBeenCalledWith(
      visionConfig,
      Buffer.from([1]),
      "image/png"
    );
    expect(identifyAssetFromNameplate).toHaveBeenCalledWith("750-451");
    expect(result).toEqual({
      status: "no-match",
      manufacturerNameGuess: "WAGO",
      articleNumberGuess: "750-451",
      rawText: "unreadable noise",
      guessSource: "vision",
    });
  });

  it("defaults the mime type to image/jpeg when the asset has none stored", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("unreadable noise");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: null,
      rawText: "unreadable noise",
    });
    getDecryptedVisionProviderConfig.mockResolvedValue({
      provider: "OPENAI",
      model: "gpt-5.6",
      apiKey: "key",
    });
    extractNameplateFieldsWithVision.mockResolvedValue({
      manufacturerName: null,
      articleNumber: null,
    });
    identifyAssetFromNameplate.mockResolvedValue(null);

    await analyzeNameplatePhoto("asset-1");

    expect(extractNameplateFieldsWithVision).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "image/jpeg"
    );
  });

  it("keeps the OCR guess (as the empty no-match result) when the vision provider also finds nothing useful", async () => {
    prisma.asset.findUnique.mockResolvedValue({ nameplateImage: new Uint8Array([1]) });
    prisma.aasRepository.findMany.mockResolvedValue([]);
    recognizeNameplateText.mockResolvedValue("unreadable noise");
    parseNameplateOcrText.mockReturnValue({
      manufacturerName: null,
      articleNumber: null,
      rawText: "unreadable noise",
    });
    getDecryptedVisionProviderConfig.mockResolvedValue({
      provider: "MISTRAL",
      model: "mistral-small-latest",
      apiKey: "key",
    });
    extractNameplateFieldsWithVision.mockResolvedValue({
      manufacturerName: null,
      articleNumber: null,
    });
    identifyAssetFromNameplate.mockResolvedValue(null);

    const result = await analyzeNameplatePhoto("asset-1");

    expect(result).toEqual({
      status: "no-match",
      manufacturerNameGuess: null,
      articleNumberGuess: null,
      rawText: "unreadable noise",
      guessSource: "ocr",
    });
  });
});

describe("linkAssetToMatchedAas", () => {
  it("sets the globalAssetId, clears any endpoint URL, reindexes, and republishes", async () => {
    const updated = {
      id: "asset-1",
      aasGlobalAssetId: "https://wago.com/ids/assets/750-451",
      aasEndpointUrl: null,
    };
    prisma.asset.update.mockResolvedValue(updated);
    reindexAssetAas.mockResolvedValue({ status: "ok", text: "searchable text", mirror: "mirrored" });

    await linkAssetToMatchedAas("asset-1", "https://wago.com/ids/assets/750-451");

    expect(prisma.asset.update).toHaveBeenNthCalledWith(1, {
      where: { id: "asset-1" },
      data: { aasGlobalAssetId: "https://wago.com/ids/assets/750-451", aasEndpointUrl: null },
    });
    expect(reindexAssetAas).toHaveBeenCalledWith(updated);
    expect(prisma.asset.update).toHaveBeenNthCalledWith(2, {
      where: { id: "asset-1" },
      data: { aasSearchText: "searchable text", aasSearchIndexedAt: expect.any(Date) },
    });
    expect(publishAssetAas).toHaveBeenCalledWith(updated);
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure/table");
    expect(revalidatePath).toHaveBeenCalledWith("/asset-structure", "layout");
  });

  it("skips the search-index update when reindexing doesn't succeed", async () => {
    const updated = { id: "asset-1" };
    prisma.asset.update.mockResolvedValue(updated);
    reindexAssetAas.mockResolvedValue({ status: "failed" });

    await linkAssetToMatchedAas("asset-1", "https://wago.com/ids/assets/750-451");

    expect(prisma.asset.update).toHaveBeenCalledTimes(1);
    expect(publishAssetAas).toHaveBeenCalledWith(updated);
  });
});

describe("publishManualNameplate", () => {
  const fields = {
    manufacturerName: "WAGO",
    productDesignation: null,
    orderCode: null,
    serialNumber: null,
    yearOfConstruction: null,
    street: null,
    zipcode: null,
    cityTown: null,
    nationalCode: null,
  };

  it("returns an error without writing anything when the asset doesn't exist", async () => {
    prisma.asset.findUnique.mockResolvedValue(null);

    const result = await publishManualNameplate("asset-1", fields);

    expect(result).toEqual({ error: "Asset not found." });
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it("marks the nameplate as generated and mirrors the shell + both submodels", async () => {
    prisma.asset.findUnique.mockResolvedValue({ id: "asset-1" });
    const updated = { id: "asset-1", nameplateSubmodelGeneratedAt: new Date() };
    prisma.asset.update.mockResolvedValue(updated);
    mirrorAasDataToLocalRepo.mockResolvedValue("mirrored");

    const result = await publishManualNameplate("asset-1", fields);

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset-1" },
      data: { nameplateSubmodelGeneratedAt: expect.any(Date) },
    });
    expect(buildAssetShell).toHaveBeenCalledWith(updated);
    expect(buildAssetMetadataSubmodel).toHaveBeenCalledWith(updated);
    expect(buildAssetNameplateSubmodel).toHaveBeenCalledWith("asset-1", fields);
    expect(mirrorAasDataToLocalRepo).toHaveBeenCalledWith({
      shell: { id: "shell" },
      submodels: [{ id: "metadata-submodel" }, { id: "nameplate-submodel" }],
    });
    expect(result).toEqual({ error: null });
  });

  it("returns an error message when mirroring fails", async () => {
    prisma.asset.findUnique.mockResolvedValue({ id: "asset-1" });
    prisma.asset.update.mockResolvedValue({ id: "asset-1" });
    mirrorAasDataToLocalRepo.mockResolvedValue("mirror-failed");

    const result = await publishManualNameplate("asset-1", fields);

    expect(result.error).toBe(
      "Could not publish the Nameplate submodel to the local AAS mirror."
    );
  });
});
