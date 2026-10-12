import type { NextConfig } from "next";

// Directivas exhaustivas para POLIS: OpenLayers (OSM), Recharts, Google OAuth, QR codes y media.
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile.osm.org https://*.googleusercontent.com https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://images.unsplash.com https://api.qrserver.com",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000 https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://accounts.google.com ws: wss:",
  "frame-src 'self' https://accounts.google.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  async headers() {
    const isReportOnly =
      process.env.POLIS_CSP_REPORT_ONLY === "true" ||
      process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "true";
    const cspHeaderKey = isReportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: cspHeaderKey,
            value: cspDirectives,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
  reactStrictMode: true,
};

export default nextConfig;

