import { beforeEach, describe, expect, it, vi } from "vitest";

const { setParameters, recognize, terminate, createWorker } = vi.hoisted(() => {
  const setParameters = vi.fn();
  const recognize = vi.fn();
  const terminate = vi.fn();
  return {
    setParameters,
    recognize,
    terminate,
    createWorker: vi.fn(async () => ({ setParameters, recognize, terminate })),
  };
});
vi.mock("tesseract.js", () => ({
  createWorker,
  PSM: { SPARSE_TEXT: 11 },
}));

const { metadata, resize, grayscale, normalize, toBuffer, sharp } = vi.hoisted(() => {
  const toBuffer = vi.fn();
  const normalize = vi.fn(() => ({ toBuffer }));
  const grayscale = vi.fn(() => ({ normalize }));
  const resize = vi.fn(() => ({ grayscale }));
  const metadata = vi.fn();
  return {
    metadata,
    resize,
    grayscale,
    normalize,
    toBuffer,
    sharp: vi.fn(() => ({ metadata, resize })),
  };
});
vi.mock("sharp", () => ({ default: sharp }));

const { recognizeNameplateText } = await import("./nameplate-ocr");

beforeEach(() => {
  vi.clearAllMocks();
  metadata.mockResolvedValue({ width: 1300 });
  toBuffer.mockResolvedValue(Buffer.from("preprocessed"));
  recognize.mockResolvedValue({ data: { text: "ITEM-NO. 750-451" } });
});

describe("recognizeNameplateText", () => {
  it("preprocesses the image (resize/grayscale/normalize) before recognizing it", async () => {
    const text = await recognizeNameplateText(Buffer.from("raw-image"));

    expect(sharp).toHaveBeenCalledWith(Buffer.from("raw-image"));
    expect(resize).toHaveBeenCalledWith({ width: 1300 });
    expect(grayscale).toHaveBeenCalled();
    expect(normalize).toHaveBeenCalled();
    expect(text).toBe("ITEM-NO. 750-451");
  });

  it("caps the resize width at the max instead of upscaling a huge photo", async () => {
    metadata.mockResolvedValue({ width: 3225 });

    await recognizeNameplateText(Buffer.from("raw-image"));

    expect(resize).toHaveBeenCalledWith({ width: 1500 });
  });

  it("raises the resize width to the minimum instead of leaving a small photo undersized", async () => {
    // A real, low-resolution (680px-wide) nameplate photo came back with
    // completely empty OCR text when left at its native size and only
    // grayscaled/normalized - upscaling it first avoided that failure.
    metadata.mockResolvedValue({ width: 680 });

    await recognizeNameplateText(Buffer.from("raw-image"));

    expect(resize).toHaveBeenCalledWith({ width: 1200 });
  });

  it("skips a fixed resize width when the image has no readable dimensions", async () => {
    metadata.mockResolvedValue({ width: undefined });

    await recognizeNameplateText(Buffer.from("raw-image"));

    expect(resize).toHaveBeenCalledWith(undefined);
  });

  it("recognizes using English and sparse-text page segmentation", async () => {
    await recognizeNameplateText(Buffer.from("raw-image"));

    expect(createWorker).toHaveBeenCalledWith(
      "eng",
      undefined,
      expect.objectContaining({
        workerPath: expect.stringContaining(
          "node_modules/tesseract.js/src/worker-script/node/index.js"
        ),
      })
    );
    expect(setParameters).toHaveBeenCalledWith({ tessedit_pageseg_mode: 11 });
    expect(recognize).toHaveBeenCalledWith(Buffer.from("preprocessed"));
  });

  it("terminates the worker even when recognition fails", async () => {
    recognize.mockRejectedValue(new Error("ocr blew up"));

    await expect(recognizeNameplateText(Buffer.from("raw-image"))).rejects.toThrow(
      "ocr blew up"
    );
    expect(terminate).toHaveBeenCalled();
  });
});
