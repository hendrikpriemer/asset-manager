import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
