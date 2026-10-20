import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy: the browser may only load scripts, styles, fonts, images, workers and
 * data from this application's own origin – no CDNs, web fonts, analytics or other third-party
 * SDKs. 'unsafe-inline' scripts are needed for Next.js' inline bootstrap without nonces;
 * 'wasm-unsafe-eval' lets pdf.js decode images in PDFs. Development additionally needs eval and a
 * WebSocket for hot reloading.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS only when the deployment is served exclusively via HTTPS (set HSTS=1).
  ...(process.env.HSTS === "1" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // Workspace data is per session and always dynamic, so the previous (request-time) rendering
  // model is used instead of Cache Components.
  cacheComponents: false,
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  serverExternalPackages: ["@libsql/client", "libsql"],
  // The app does not use next/image, so the optional LGPL-licensed sharp/libvips binaries are
  // neither needed nor shipped (see /lizenzen).
  images: { unoptimized: true },
  // Never bundle local databases, test artefacts or the unused image optimizer into the standalone output.
  outputFileTracingExcludes: {
    "*": ["./data/**", "./tests/**", "./scripts/**", "./test-results/**", "./node_modules/sharp/**", "./node_modules/@img/**"],
  },
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
