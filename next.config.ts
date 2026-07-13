import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const defaultAppWebviewOrigins = [
  (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, ""),
].filter(Boolean);

const appWebviewOrigins = (process.env.APP_WEBVIEW_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedFrameAncestors = [
  "'self'",
  ...(appWebviewOrigins.length > 0 ? appWebviewOrigins : defaultAppWebviewOrigins),
].join(" ");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // tesseract.js resolves its worker script relative to its own package
  // directory at runtime (fs paths, not static imports) — letting webpack
  // bundle it breaks that resolution in the serverless output and crashes
  // with MODULE_NOT_FOUND. Keep it as a native, unbundled require instead.
  serverExternalPackages: ["tesseract.js"],
  async rewrites() {
    return [
      {
        source: "/google:hash.html",
        destination: "/api/google-verification?hash=:hash",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors ${allowedFrameAncestors};`,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
