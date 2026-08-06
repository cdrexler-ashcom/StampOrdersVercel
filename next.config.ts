import type { NextConfig } from "next";

/**
 * The browser always talks to this app's own origin. Requests to /api/* are proxied
 * server-side to the StampOrders C# API.
 *
 * This is deliberate: it means the API's Cors:AllowedOrigins can stay empty, no
 * preflight round-trips happen, and the API base URL is never exposed to the client.
 */
const apiBaseUrl =
  process.env.STAMP_ORDERS_API_URL?.replace(/\/$/, "") ?? "http://localhost:57901";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` },
      { source: "/health/:path*", destination: `${apiBaseUrl}/health/:path*` },
    ];
  },
};

export default nextConfig;
