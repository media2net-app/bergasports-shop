/** @type {import("next").NextConfig} */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadMigrationRedirects() {
  try {
    const raw = fs.readFileSync(
      path.join(__dirname, "docs/migration/redirect-map.json"),
      "utf8",
    );
    const data = JSON.parse(raw);
    return Array.isArray(data.redirects) ? data.redirects : [];
  } catch {
    return [];
  }
}

const nextConfig = {
  reactCompiler: true,
  transpilePackages: ["quill", "lodash-es"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [48, 64, 80, 96, 128, 256, 384, 400],
    remotePatterns: [
      { protocol: "https", hostname: "**.bergasports.com" },
      { protocol: "https", hostname: "www.bergasports.com" },
      { protocol: "https", hostname: "**.prisma.io" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/room-match",
        destination: "/shop",
        permanent: true,
      },
      ...loadMigrationRedirects(),
    ];
  },
};

export default nextConfig;
