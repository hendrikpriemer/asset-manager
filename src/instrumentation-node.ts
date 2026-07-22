import { setDefaultResultOrder } from "node:dns";

/**
 * This dev/deployment environment's IPv6 egress is broken (connections
 * hang instead of failing fast), so Node's default "prefer whichever
 * address family DNS returns first" behavior can leave any external fetch
 * (AAS repository lookups, the AAS file proxy) hanging for the full
 * request timeout before falling back to IPv4. Confirmed live against
 * WAGO's AAS API: the same fetch went from timing out at 15s to
 * succeeding in ~6s once IPv4 was preferred.
 */
export function register() {
  setDefaultResultOrder("ipv4first");
}
