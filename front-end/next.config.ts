import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warnings won't fail the production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
