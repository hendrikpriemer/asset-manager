import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

const { prisma } = vi.hoisted(() => ({
  prisma: {
    visionProviderSetting: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

const { encryptSecret } = vi.hoisted(() => ({ encryptSecret: vi.fn() }));
vi.mock("@/lib/secret-encryption", () => ({ encryptSecret }));

const { testVisionProviderConnection: sendConnectionTestRequest } = vi.hoisted(() => ({
  testVisionProviderConnection: vi.fn(),
}));
vi.mock("@/lib/vision-providers/test-connection", () => ({
  testVisionProviderConnection: sendConnectionTestRequest,
}));

const {
  saveVisionProviderSetting,
  deleteVisionProviderSetting,
  testVisionProviderConnection,
} = await import("./vision-provider-actions");

function formDataWith(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveVisionProviderSetting", () => {
  it("returns a validation error without touching the database when the input is invalid", async () => {
    const result = await saveVisionProviderSetting(
      { error: null },
      formDataWith({ provider: "ANTHROPIC", model: "", apiKey: "key" })
    );

    expect(result).toEqual({ error: "Model is required." });
    expect(prisma.visionProviderSetting.create).not.toHaveBeenCalled();
    expect(prisma.visionProviderSetting.update).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors instead of swallowing them", async () => {
    const formData = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as FormData;

    await expect(saveVisionProviderSetting({ error: null }, formData)).rejects.toThrow("boom");
    expect(prisma.visionProviderSetting.create).not.toHaveBeenCalled();
  });

  it("creates a new setting (encrypting the key) when none exists yet", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue(null);
    encryptSecret.mockReturnValue("encrypted-blob");

    const result = await saveVisionProviderSetting(
      { error: null },
      formDataWith({ provider: "ANTHROPIC", model: "claude-sonnet-5", apiKey: "sk-ant-test" })
    );

    expect(encryptSecret).toHaveBeenCalledWith("sk-ant-test");
    expect(prisma.visionProviderSetting.create).toHaveBeenCalledWith({
      data: { provider: "ANTHROPIC", model: "claude-sonnet-5", encryptedApiKey: "encrypted-blob" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/vision-provider");
    expect(result).toEqual({ error: null });
  });

  it("returns an error instead of creating a setting with no API key when none exists yet", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue(null);

    const result = await saveVisionProviderSetting(
      { error: null },
      formDataWith({ provider: "ANTHROPIC", model: "claude-sonnet-5", apiKey: "" })
    );

    expect(result).toEqual({ error: "API key is required." });
    expect(prisma.visionProviderSetting.create).not.toHaveBeenCalled();
    expect(encryptSecret).not.toHaveBeenCalled();
  });

  it("keeps the previously-stored encrypted key when the form's API key is left blank", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue({
      id: "setting-1",
      encryptedApiKey: "already-encrypted-blob",
    });

    const result = await saveVisionProviderSetting(
      { error: null },
      formDataWith({ provider: "OPENAI", model: "gpt-5.6", apiKey: "" })
    );

    expect(encryptSecret).not.toHaveBeenCalled();
    expect(prisma.visionProviderSetting.update).toHaveBeenCalledWith({
      where: { id: "setting-1" },
      data: { provider: "OPENAI", model: "gpt-5.6", encryptedApiKey: "already-encrypted-blob" },
    });
    expect(result).toEqual({ error: null });
  });

  it("updates the existing setting instead of creating a second one", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue({ id: "setting-1" });
    encryptSecret.mockReturnValue("encrypted-blob");

    await saveVisionProviderSetting(
      { error: null },
      formDataWith({ provider: "OPENAI", model: "gpt-5.6", apiKey: "sk-openai-test" })
    );

    expect(prisma.visionProviderSetting.update).toHaveBeenCalledWith({
      where: { id: "setting-1" },
      data: { provider: "OPENAI", model: "gpt-5.6", encryptedApiKey: "encrypted-blob" },
    });
    expect(prisma.visionProviderSetting.create).not.toHaveBeenCalled();
  });
});

describe("deleteVisionProviderSetting", () => {
  it("deletes the existing setting and revalidates", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue({ id: "setting-1" });

    await deleteVisionProviderSetting();

    expect(prisma.visionProviderSetting.delete).toHaveBeenCalledWith({
      where: { id: "setting-1" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/vision-provider");
  });

  it("does nothing (but still revalidates) when no setting exists", async () => {
    prisma.visionProviderSetting.findFirst.mockResolvedValue(null);

    await deleteVisionProviderSetting();

    expect(prisma.visionProviderSetting.delete).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/settings/vision-provider");
  });
});

describe("testVisionProviderConnection", () => {
  it("returns 'reachable' when the underlying request succeeds", async () => {
    sendConnectionTestRequest.mockResolvedValue(true);

    const result = await testVisionProviderConnection("ANTHROPIC", "claude-sonnet-5", "key");

    expect(sendConnectionTestRequest).toHaveBeenCalledWith({
      provider: "ANTHROPIC",
      model: "claude-sonnet-5",
      apiKey: "key",
    });
    expect(result).toEqual({ status: "reachable" });
  });

  it("returns 'unreachable' when the underlying request fails", async () => {
    sendConnectionTestRequest.mockResolvedValue(false);

    const result = await testVisionProviderConnection("OPENAI", "gpt-5.6", "key");

    expect(result).toEqual({ status: "unreachable" });
  });
});
