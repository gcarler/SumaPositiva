import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { proxyClientMaxBodySize: "40mb" },
  // Route the browser API through Next.js to keep a single public origin.
  async rewrites() {
    const backendUrl = process.env.POLIS_BACKEND_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*` },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;
