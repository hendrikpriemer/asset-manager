import { afterEach, describe, expect, it, vi } from "vitest";
import { callAnthropicVision, testAnthropicConnection } from "./anthropic-client";

const config = { provider: "ANTHROPIC" as const, model: "claude-sonnet-5", apiKey: "sk-ant-test" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callAnthropicVision", () => {
  it("sends the image as a base64 content block and returns the response text", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(init.headers).toMatchObject({
        "x-api-key": "sk-ant-test",
        "anthropic-version": "2023-06-01",
      });
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("claude-sonnet-5");
      expect(body.messages[0].content[0]).toEqual({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: "base64data" },
      });
      expect(body.messages[0].content[1]).toEqual({ type: "text", text: "prompt text" });
      return new Response(JSON.stringify({ content: [{ text: '{"manufacturerName":"WAGO"}' }] }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callAnthropicVision(config, "base64data", "image/jpeg", "prompt text");

    expect(result).toBe('{"manufacturerName":"WAGO"}');
  });

  it("throws when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    await expect(
      callAnthropicVision(config, "base64data", "image/jpeg", "prompt")
    ).rejects.toThrow("Anthropic API request failed with status 401");
  });

  it("throws when the response has no text content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ content: [] }), { status: 200 }))
    );

    await expect(
      callAnthropicVision(config, "base64data", "image/jpeg", "prompt")
    ).rejects.toThrow("Anthropic API response did not contain text content.");
  });
});

describe("testAnthropicConnection", () => {
  it("returns true for an ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await expect(testAnthropicConnection(config)).resolves.toBe(true);
  });

  it("returns false for a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    await expect(testAnthropicConnection(config)).resolves.toBe(false);
  });

  it("returns false when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(testAnthropicConnection(config)).resolves.toBe(false);
  });
});
