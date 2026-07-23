import { afterEach, describe, expect, it, vi } from "vitest";
import { callOpenAiVision, testOpenAiConnection } from "./openai-client";

const config = { provider: "OPENAI" as const, model: "gpt-5.6", apiKey: "sk-openai-test" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callOpenAiVision", () => {
  it("sends the image as a data-URI image_url and returns the response text", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.openai.com/v1/chat/completions");
      expect(init.headers).toMatchObject({ Authorization: "Bearer sk-openai-test" });
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("gpt-5.6");
      expect(body.messages[0].content[0]).toEqual({ type: "text", text: "prompt text" });
      expect(body.messages[0].content[1]).toEqual({
        type: "image_url",
        image_url: { url: "data:image/jpeg;base64,base64data" },
      });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"articleNumber":"750-451"}' } }] }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callOpenAiVision(config, "base64data", "image/jpeg", "prompt text");

    expect(result).toBe('{"articleNumber":"750-451"}');
  });

  it("throws when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 429 })));

    await expect(callOpenAiVision(config, "base64data", "image/jpeg", "prompt")).rejects.toThrow(
      "OpenAI API request failed with status 429"
    );
  });

  it("throws when the response has no message content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    );

    await expect(callOpenAiVision(config, "base64data", "image/jpeg", "prompt")).rejects.toThrow(
      "OpenAI API response did not contain message content."
    );
  });
});

describe("testOpenAiConnection", () => {
  it("returns true for an ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await expect(testOpenAiConnection(config)).resolves.toBe(true);
  });

  it("returns false for a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    await expect(testOpenAiConnection(config)).resolves.toBe(false);
  });

  it("returns false when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(testOpenAiConnection(config)).resolves.toBe(false);
  });
});
