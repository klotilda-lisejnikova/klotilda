import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const apiHostname = new URL(apiUrl).hostname;

// Where the photos load from when not from the API itself: the R2 bucket's public URL (the API's
// R2_PUBLIC_BASE_URL). Only these hosts may pass through the image optimizer, so it can't be used
// to fetch and resize anyone else's pictures. A production build without it would show no photos.
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;
if (!mediaUrl && process.env.VERCEL_ENV === "production") {
  throw new Error("Missing NEXT_PUBLIC_MEDIA_URL (the R2 bucket's public URL)");
}

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: apiUrl.startsWith("https") ? "https" : "http",
    hostname: apiHostname,
  },
];

if (mediaUrl) {
  remotePatterns.push({
    protocol: mediaUrl.startsWith("https") ? "https" : "http",
    hostname: new URL(mediaUrl).hostname,
  });
}

/**
 * Sent with every page. No script policy: Next.js inlines its own scripts; this keeps the site
 * out of other sites' frames and limits what a page could be made to load or submit.
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Zásilkovna's map (checkout) may ask for the location, for its "near me".
  {
    key: "Permissions-Policy",
    value:
      'camera=(), microphone=(), geolocation=(self "https://widget.packeta.com")',
  },
];

// The project version lives in the root package.json (`pnpm release`). Next runs this file
// from apps/web, locally and on Vercel.
const { version } = JSON.parse(
  readFileSync(join(process.cwd(), "../../package.json"), "utf8"),
) as { version: string };

const nextConfig: NextConfig = {
  // The shared domain package ships TypeScript source.
  transpilePackages: ["@klotilda/domain"],
  // Shown in the footer. The commit is added outside production so a test build can be told apart.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_APP_COMMIT:
      process.env.VERCEL_ENV === "production"
        ? ""
        : (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
