import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server blocks cross-origin requests to dev-only assets/
  // endpoints (HMR websocket, JS chunks, source maps) by default, only
  // trusting `localhost`. Testing from a phone/tablet over the LAN hits the
  // server via its LAN IP instead, so those requests get silently blocked -
  // confirmed live: the HMR websocket failed to connect and a core Next.js
  // client chunk failed "due to access control checks" when loaded from an
  // iPad at 192.168.178.32. That leaves the page LOOKING rendered (SSR HTML)
  // while hydration/JS is broken - inputs still accept typed text natively,
  // but React state, event handlers, and anything driven by them stop
  // working, exactly matching "menu won't collapse / buttons don't respond".
  // The Fritz!Box-assigned hostname survives DHCP lease renewals (unlike
  // the raw LAN IP, which already changed once during testing) - prefer
  // https://MacBookAir.fritz.box:3000 from other devices on the LAN. The
  // IP is kept too as a fallback; the dev cert in certificates/ covers both.
  allowedDevOrigins: ["192.168.178.25", "MacBookAir.fritz.box"],
  // Default position (bottom-left) sits directly over the Sidebar's footer
  // nav items (Settings/Info, also docked bottom-left) - on a narrow mobile
  // viewport the indicator can end up overlapping and intercepting taps
  // meant for those links. Dev-only; has no effect on production builds.
  devIndicators: {
    position: "bottom-right",
  },
  experimental: {
    serverActions: {
      // Asset create/edit submits up to two photos (assetImage +
      // nameplateImage) in one Server Action call - real smartphone photos
      // routinely exceed Next's 1MB default, which was rejecting uploads
      // with "Body exceeded 1 MB limit" (413).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
