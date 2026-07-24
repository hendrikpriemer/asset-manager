import { beforeEach, describe, expect, it, vi } from "vitest";

const { ensureAlpha, raw, toBuffer, sharp } = vi.hoisted(() => {
  const toBuffer = vi.fn();
  const raw = vi.fn(() => ({ toBuffer }));
  const ensureAlpha = vi.fn(() => ({ raw }));
  return { ensureAlpha, raw, toBuffer, sharp: vi.fn(() => ({ ensureAlpha })) };
});
vi.mock("sharp", () => ({ default: sharp }));

const { jsQR } = vi.hoisted(() => ({ jsQR: vi.fn() }));
vi.mock("jsqr", () => ({ default: jsQR }));

const { decodeNameplateQrCode } = await import("./nameplate-qr");

beforeEach(() => {
  vi.clearAllMocks();
  toBuffer.mockResolvedValue({
    data: Buffer.from([1, 2, 3, 4]),
    info: { width: 2, height: 1 },
  });
});

describe("decodeNameplateQrCode", () => {
  it("decodes a QR code found in the image", async () => {
    jsQR.mockReturnValue({ data: "https://example.com/product/1" });

    const result = await decodeNameplateQrCode(Buffer.from("raw-image"));

    expect(sharp).toHaveBeenCalledWith(Buffer.from("raw-image"));
    expect(ensureAlpha).toHaveBeenCalled();
    expect(raw).toHaveBeenCalled();
    expect(jsQR).toHaveBeenCalledWith(new Uint8ClampedArray(Buffer.from([1, 2, 3, 4])), 2, 1);
    expect(result).toBe("https://example.com/product/1");
  });

  it("returns null when no QR code is found in the image", async () => {
    jsQR.mockReturnValue(null);

    const result = await decodeNameplateQrCode(Buffer.from("raw-image"));

    expect(result).toBeNull();
  });
});
