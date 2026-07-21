import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupCoordinatesForAddress, lookupTimezoneForAddress } from "./timezone";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("lookupTimezoneForAddress", () => {
  it("returns null for an empty address without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupTimezoneForAddress("")).toBeNull();
    expect(await lookupTimezoneForAddress("   ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the timezone for a single-segment address", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain(encodeURIComponent("New York"));
      return jsonResponse({
        results: [{ country_code: "US", timezone: "America/New_York" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupTimezoneForAddress("New York")).toBe(
      "America/New_York"
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("prefers the result matching the country parsed from the address's last segment", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [
          { country_code: "US", timezone: "America/Chicago" },
          { country_code: "DE", timezone: "Europe/Berlin" },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupTimezoneForAddress(
      "Hansastr. 27, Minden, Germany"
    );

    expect(result).toBe("Europe/Berlin");
    // The city segment ("Minden") is tried before the full address.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent("Minden")),
      expect.anything()
    );
  });

  it("strips a leading postal code from a 'zip city' segment (e.g. a postal address line)", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes(`name=${encodeURIComponent("Minden")}&`)) {
        return jsonResponse({
          results: [{ country_code: "DE", timezone: "Europe/Berlin" }],
        });
      }
      // Neither "32423 Minden" nor the full address is a real place name
      // Open-Meteo's search can match.
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupTimezoneForAddress(
      "Hansastr. 27, 32423 Minden, Germany"
    );

    expect(result).toBe("Europe/Berlin");
  });

  it("falls back to the first result when the country is not recognized", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        results: [{ country_code: "FR", timezone: "Europe/Paris" }],
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupTimezoneForAddress("Some Street, Neverland");

    expect(result).toBe("Europe/Paris");
  });

  it("falls back to the full address when the city-segment query has no results", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes(`name=${encodeURIComponent("Minden")}&`)) {
        return jsonResponse({ results: [] });
      }
      return jsonResponse({
        results: [{ country_code: "DE", timezone: "Europe/Berlin" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupTimezoneForAddress(
      "Hansastr. 27, Minden, Germany"
    );

    expect(result).toBe("Europe/Berlin");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when no candidate query yields a result", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ results: [] })));

    expect(await lookupTimezoneForAddress("Nowhere, Neverland")).toBeNull();
  });

  it("returns null when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    expect(await lookupTimezoneForAddress("Berlin")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    expect(await lookupTimezoneForAddress("Berlin")).toBeNull();
  });

  it("treats a missing results field as no results", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({})));

    expect(await lookupTimezoneForAddress("Berlin")).toBeNull();
  });

  it("returns null without calling fetch when the address has no real segments", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupTimezoneForAddress("  ,  ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("lookupCoordinatesForAddress", () => {
  it("returns null for an empty address without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupCoordinatesForAddress("")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns coordinates for a single-segment address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          results: [{ country_code: "US", latitude: 40.7128, longitude: -74.006 }],
        })
      )
    );

    expect(await lookupCoordinatesForAddress("New York")).toEqual({
      lat: 40.7128,
      lon: -74.006,
    });
  });

  it("prefers the result matching the country parsed from the address's last segment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          results: [
            { country_code: "US", latitude: 41.8781, longitude: -87.6298 },
            { country_code: "DE", latitude: 52.2907, longitude: 8.9126 },
          ],
        })
      )
    );

    const result = await lookupCoordinatesForAddress(
      "Hansastr. 27, Minden, Germany"
    );

    expect(result).toEqual({ lat: 52.2907, lon: 8.9126 });
  });

  it("strips a leading postal code from a 'zip city' segment (e.g. a postal address line)", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes(`name=${encodeURIComponent("Minden")}&`)) {
        return jsonResponse({
          results: [{ country_code: "DE", latitude: 52.2907, longitude: 8.9126 }],
        });
      }
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCoordinatesForAddress(
      "Hansastr. 27, 32423 Minden, Germany"
    );

    expect(result).toEqual({ lat: 52.2907, lon: 8.9126 });
  });

  it("falls back to the first result when the country is not recognized", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          results: [{ country_code: "FR", latitude: 48.8566, longitude: 2.3522 }],
        })
      )
    );

    const result = await lookupCoordinatesForAddress("Some Street, Neverland");

    expect(result).toEqual({ lat: 48.8566, lon: 2.3522 });
  });

  it("falls back to the full address when the city-segment query's match has no coordinates", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes(`name=${encodeURIComponent("Minden")}&`)) {
        return jsonResponse({ results: [{ country_code: "DE" }] });
      }
      return jsonResponse({
        results: [{ country_code: "DE", latitude: 52.2907, longitude: 8.9126 }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupCoordinatesForAddress(
      "Hansastr. 27, Minden, Germany"
    );

    expect(result).toEqual({ lat: 52.2907, lon: 8.9126 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when no candidate query yields coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ results: [] })));

    expect(await lookupCoordinatesForAddress("Nowhere, Neverland")).toBeNull();
  });

  it("returns null when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    expect(await lookupCoordinatesForAddress("Berlin")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    expect(await lookupCoordinatesForAddress("Berlin")).toBeNull();
  });

  it("returns null without calling fetch when the address has no real segments", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await lookupCoordinatesForAddress("  ,  ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
