import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixes Cross-Origin errors when accessing from mobile or local Wi-Fi IP
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "localhost:3000",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
