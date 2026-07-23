import { afterEach, describe, expect, it, vi } from "vitest";
import { callMistralVision, testMistralConnection } from "./mistral-client";

const config = { provider: "MISTRAL" as const, model: "mistral-small-latest", apiKey: "mistral-test" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("callMistralVision", () => {
  it("sends the image as a bare data-URI string and returns the response text", async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
      expect(init.headers).toMatchObject({ Authorization: "Bearer mistral-test" });
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe("mistral-small-latest");
      expect(body.messages[0].content[0]).toEqual({ type: "text", text: "prompt text" });
      expect(body.messages[0].content[1]).toEqual({
        type: "image_url",
        image_url: "data:image/jpeg;base64,base64data",
      });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"manufacturerName":"WAGO"}' } }] }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callMistralVision(config, "base64data", "image/jpeg", "prompt text");

    expect(result).toBe('{"manufacturerName":"WAGO"}');
  });

  it("throws when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(callMistralVision(config, "base64data", "image/jpeg", "prompt")).rejects.toThrow(
      "Mistral API request failed with status 500"
    );
  });

  it("throws when the response has no message content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ choices: [] }), { status: 200 }))
    );

    await expect(callMistralVision(config, "base64data", "image/jpeg", "prompt")).rejects.toThrow(
      "Mistral API response did not contain message content."
    );
  });
});

describe("testMistralConnection", () => {
  it("returns true for an ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));

    await expect(testMistralConnection(config)).resolves.toBe(true);
  });

  it("returns false for a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 401 })));

    await expect(testMistralConnection(config)).resolves.toBe(false);
  });

  it("returns false when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(testMistralConnection(config)).resolves.toBe(false);
  });
});
