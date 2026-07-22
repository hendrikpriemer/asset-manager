/**
 * Guards against SSRF when a server-side fetch target is derived from data
 * we don't fully control (e.g. a `File` element's `value` URL inside AAS
 * content fetched from an external, admin-configured repository - see
 * `src/app/api/assets/[assetId]/aas-files/route.ts`). A compromised or
 * malicious repository could otherwise point a file reference at our own
 * internal network (e.g. `http://db:5432`) and use our server as a proxy
 * into it.
 */

import { lookup } from "node:dns/promises";

export class UnsafeUrlError extends Error {}

// Not an exhaustive, RFC-perfect IP-range parser - a deliberately simple,
// well-documented set of the private/reserved ranges that matter for SSRF
// protection (loopback, link-local, and the private/CGNAT/reserved blocks).
const IPV4_PRIVATE_RANGES: readonly [base: string, prefixBits: number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIpv4(address: string): boolean {
  const addressInt = ipv4ToInt(address);
  return IPV4_PRIVATE_RANGES.some(([base, prefixBits]) => {
    const mask = (0xffffffff << (32 - prefixBits)) >>> 0;
    return (addressInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 (unique local)
  if (["fe8", "fe9", "fea", "feb"].some((prefix) => normalized.startsWith(prefix))) {
    return true; // fe80::/10 (link-local)
  }
  return false;
}

export async function assertPubliclyRoutableUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnsafeUrlError(`Not a valid URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError(`Unsupported protocol: ${parsed.protocol}`);
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  for (const { address, family } of addresses) {
    const isPrivate = family === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address);
    if (isPrivate) {
      throw new UnsafeUrlError(
        `${parsed.hostname} resolves to a private/reserved address: ${address}`
      );
    }
  }
}
