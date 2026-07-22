import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup, default: { lookup } }));

const { assertPubliclyRoutableUrl, UnsafeUrlError } = await import("./url-safety");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assertPubliclyRoutableUrl", () => {
  it("allows a public host resolving to a public IPv4 address", async () => {
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);

    await expect(
      assertPubliclyRoutableUrl("https://example.com/file.pdf")
    ).resolves.toBeUndefined();
  });

  it("allows a public host resolving to a public IPv6 address", async () => {
    lookup.mockResolvedValue([{ address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }]);

    await expect(
      assertPubliclyRoutableUrl("https://example.com/file.pdf")
    ).resolves.toBeUndefined();
  });

  it("rejects a non-http(s) protocol without doing a DNS lookup", async () => {
    await expect(assertPubliclyRoutableUrl("ftp://example.com/file")).rejects.toThrow(
      UnsafeUrlError
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  it("rejects an unparseable URL without doing a DNS lookup", async () => {
    await expect(assertPubliclyRoutableUrl("not a url")).rejects.toThrow(UnsafeUrlError);
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    ["0.0.0.0"],
    ["10.1.2.3"],
    ["100.64.0.1"],
    ["127.0.0.1"],
    ["169.254.1.1"],
    ["172.16.0.1"],
    ["172.31.255.255"],
    ["192.0.0.1"],
    ["192.168.1.1"],
    ["198.18.0.1"],
    ["224.0.0.1"],
    ["240.0.0.1"],
  ])("rejects the private/reserved IPv4 address %s", async (address) => {
    lookup.mockResolvedValue([{ address, family: 4 }]);

    await expect(assertPubliclyRoutableUrl("https://internal.example/x")).rejects.toThrow(
      UnsafeUrlError
    );
  });

  it("does not reject an IPv4 address just outside the 172.16.0.0/12 private range", async () => {
    lookup.mockResolvedValue([{ address: "172.32.0.1", family: 4 }]);

    await expect(
      assertPubliclyRoutableUrl("https://example.com/x")
    ).resolves.toBeUndefined();
  });

  it.each([["::1"], ["fc00::1"], ["fd12::1"], ["fe80::1"]])(
    "rejects the private/reserved IPv6 address %s",
    async (address) => {
      lookup.mockResolvedValue([{ address, family: 6 }]);

      await expect(assertPubliclyRoutableUrl("https://internal.example/x")).rejects.toThrow(
        UnsafeUrlError
      );
    }
  );

  it("rejects when any one of several resolved addresses is private", async () => {
    lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]);

    await expect(assertPubliclyRoutableUrl("https://example.com/x")).rejects.toThrow(
      UnsafeUrlError
    );
  });
});
