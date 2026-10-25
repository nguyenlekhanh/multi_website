import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Theme package uploads (ZIP ≤ 2 MB enforced in the validator).
      bodySizeLimit: '3mb',
    },
  },
};

export default nextConfig;
