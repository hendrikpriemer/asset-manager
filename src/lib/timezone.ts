/**
 * Best-effort timezone lookup for a free-text address, via Open-Meteo's free
 * geocoding API (no API key required). The API's place-name search doesn't
 * reliably handle full comma-separated addresses, so we try the likely
 * city segment first, then the address as a whole. Ambiguous place names
 * (e.g. "Minden" exists in both Germany and the US) are disambiguated with
 * a small, deliberately non-exhaustive map from country name to ISO code
 * parsed from the address's last segment - unmapped countries simply skip
 * that disambiguation step and fall back to the top match.
 */

const FETCH_TIMEOUT_MS = 5000;
const GEOCODE_RESULT_COUNT = 10;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  austria: "AT",
  österreich: "AT",
  switzerland: "CH",
  schweiz: "CH",
  france: "FR",
  italy: "IT",
  italien: "IT",
  spain: "ES",
  spanien: "ES",
  netherlands: "NL",
  niederlande: "NL",
  belgium: "BE",
  belgien: "BE",
  poland: "PL",
  polen: "PL",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  canada: "CA",
  japan: "JP",
  china: "CN",
  india: "IN",
  brazil: "BR",
  brasilien: "BR",
  australia: "AU",
  australien: "AU",
};

type GeocodingResult = { country_code?: string; timezone?: string };

function resolveCountryCode(segment: string | undefined): string | null {
  if (!segment) return null;
  return COUNTRY_NAME_TO_CODE[segment.trim().toLowerCase()] ?? null;
}

function candidateQueries(address: string): string[] {
  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) return [];
  const city = segments.length >= 2 ? segments[segments.length - 2] : segments[0];
  return [...new Set([city, address])];
}

async function fetchGeocodingResults(query: string): Promise<GeocodingResult[]> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${GEOCODE_RESULT_COUNT}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { results?: GeocodingResult[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

export async function lookupTimezoneForAddress(
  address: string
): Promise<string | null> {
  const trimmed = address.trim();
  if (!trimmed) {
    return null;
  }

  const segments = trimmed.split(",").map((segment) => segment.trim());
  const countryCode = resolveCountryCode(segments[segments.length - 1]);

  for (const query of candidateQueries(trimmed)) {
    const results = await fetchGeocodingResults(query);
    const preferred = countryCode
      ? results.find((result) => result.country_code === countryCode)
      : undefined;
    const timezone = (preferred ?? results[0])?.timezone;
    if (timezone) {
      return timezone;
    }
  }

  return null;
}
