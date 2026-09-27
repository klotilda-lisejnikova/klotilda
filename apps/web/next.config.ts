import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const apiHostname = new URL(apiUrl).hostname;

// Optional production media domain — a custom R2 domain like media.klotilda.cz (matches the
// API's R2_PUBLIC_BASE_URL).
const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: apiUrl.startsWith("https") ? "https" : "http",
    hostname: apiHostname,
  },
  // Cloudflare R2 public dev buckets (pub-<hash>.r2.dev) — so <Image> works on dev/test
  // deploys without the exact bucket URL wired into the build env.
  { protocol: "https", hostname: "**.r2.dev" },
];

if (mediaUrl) {
  remotePatterns.push({
    protocol: mediaUrl.startsWith("https") ? "https" : "http",
    hostname: new URL(mediaUrl).hostname,
  });
}

const nextConfig: NextConfig = {
  // The shared domain package ships TypeScript source.
  transpilePackages: ["@klotilda/domain"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },
};

export default withNextIntl(nextConfig);
