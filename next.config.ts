import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  webpack(config, { dev }) {
    if (dev)
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 200,
      };
    return config;
  },
};
export default nextConfig;
