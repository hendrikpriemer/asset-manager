import { describe, expect, it } from "vitest";
import { AssetImageValidationError, parseAssetImage } from "./asset-images";

function formDataWithFile(
  fieldName: string,
  file: File | null
): FormData {
  const formData = new FormData();
  if (file) {
    formData.set(fieldName, file);
  }
  return formData;
}

describe("parseAssetImage", () => {
  it("returns null when the field is missing", async () => {
    const formData = new FormData();

    expect(await parseAssetImage(formData, "assetImage", "Asset photo")).toBeNull();
  });

  it("returns null when the field is not a file", async () => {
    const formData = new FormData();
    formData.set("assetImage", "not-a-file");

    expect(await parseAssetImage(formData, "assetImage", "Asset photo")).toBeNull();
  });

  it("returns null when an empty file is submitted", async () => {
    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    const formData = formDataWithFile("assetImage", emptyFile);

    expect(await parseAssetImage(formData, "assetImage", "Asset photo")).toBeNull();
  });

  it("parses a valid JPEG file into a buffer and type", async () => {
    const file = new File(["fake-image-bytes"], "photo.jpg", {
      type: "image/jpeg",
    });
    const formData = formDataWithFile("assetImage", file);

    const result = await parseAssetImage(formData, "assetImage", "Asset photo");

    expect(result?.type).toBe("image/jpeg");
    expect(Buffer.from(result!.data).toString()).toBe("fake-image-bytes");
  });

  it("accepts PNG and WEBP images", async () => {
    const pngFile = new File(["png-bytes"], "photo.png", { type: "image/png" });
    const webpFile = new File(["webp-bytes"], "photo.webp", {
      type: "image/webp",
    });

    expect(
      await parseAssetImage(formDataWithFile("a", pngFile), "a", "Photo")
    ).not.toBeNull();
    expect(
      await parseAssetImage(formDataWithFile("a", webpFile), "a", "Photo")
    ).not.toBeNull();
  });

  it("rejects an unsupported file type", async () => {
    const file = new File(["pdf-bytes"], "doc.pdf", {
      type: "application/pdf",
    });
    const formData = formDataWithFile("assetImage", file);

    await expect(
      parseAssetImage(formData, "assetImage", "Asset photo")
    ).rejects.toThrow(
      new AssetImageValidationError(
        "Asset photo must be a JPEG, PNG, or WEBP image."
      )
    );
  });

  it("rejects a file larger than the size limit", async () => {
    const oversized = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    const formData = formDataWithFile("assetImage", oversized);

    await expect(
      parseAssetImage(formData, "assetImage", "Asset photo")
    ).rejects.toThrow(
      new AssetImageValidationError("Asset photo must be smaller than 8 MB.")
    );
  });
});
