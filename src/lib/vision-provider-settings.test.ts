import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { visionProviderSetting: { findFirst: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { decryptSecret } = vi.hoisted(() => ({ decryptSecret: vi.fn() }));
vi.mock("@/lib/secret-encryption", () => ({ decryptSecret }));

const { getVisionProviderSetting, getDecryptedVisionProviderConfig } = await import(
  "./vision-provider-settings"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getVisionProviderSetting", () => {
  it("returns the provider and model, never the encrypted key, when a setting exists", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue({
      id: "setting-1",
      provider: "ANTHROPIC",
      model: "claude-sonnet-5",
      encryptedApiKey: "encrypted-blob",
    });

    const result = await getVisionProviderSetting();

    expect(result).toEqual({ provider: "ANTHROPIC", model: "claude-sonnet-5" });
    expect(JSON.stringify(result)).not.toContain("encrypted-blob");
  });

  it("returns null when no setting exists", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue(null);

    await expect(getVisionProviderSetting()).resolves.toBeNull();
  });
});

describe("getDecryptedVisionProviderConfig", () => {
  it("returns the decrypted API key alongside the provider and model", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue({
      id: "setting-1",
      provider: "OPENAI",
      model: "gpt-5.6",
      encryptedApiKey: "encrypted-blob",
    });
    decryptSecret.mockReturnValue("sk-openai-real-key");

    const result = await getDecryptedVisionProviderConfig();

    expect(decryptSecret).toHaveBeenCalledWith("encrypted-blob");
    expect(result).toEqual({ provider: "OPENAI", model: "gpt-5.6", apiKey: "sk-openai-real-key" });
  });

  it("returns null when no setting exists", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue(null);

    await expect(getDecryptedVisionProviderConfig()).resolves.toBeNull();
    expect(decryptSecret).not.toHaveBeenCalled();
  });
});
