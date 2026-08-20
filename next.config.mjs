/** @type {import("next").NextConfig} */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadRedirectFile(filename) {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "docs/migration", filename), "utf8");
    const data = JSON.parse(raw);
    const rows = Array.isArray(data.redirects) ? data.redirects : [];
    return rows
      .filter((row) => row?.source && row?.destination && row.source !== row.destination)
      .map((row) => ({
        source: row.source,
        destination: row.destination,
        statusCode: 301,
      }));
  } catch {
    return [];
  }
}

function mergeRedirects(lists) {
  const seen = new Set();
  const out = [];
  for (const row of lists.flat()) {
    if (!row?.source || seen.has(row.source)) continue;
    seen.add(row.source);
    out.push(row);
  }
  return out;
}

const nextConfig = {
  reactCompiler: true,
  transpilePackages: ["quill", "lodash-es"],
  images: {
    formats: ["image/avif", "image/webp"],
    // Next 16 defaults to [75] only; allow qualities used by hero + product images.
    qualities: [75, 78, 82, 88, 92],
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
    return mergeRedirects([
      [{ source: "/room-match", destination: "/shop", statusCode: 301 }],
      loadRedirectFile("redirect-map.json"),
      loadRedirectFile("redirect-map.generated.json"),
      [
        { source: "/nl/product/:slug", destination: "/product/:slug", statusCode: 301 },
        { source: "/en/product/:slug", destination: "/product/:slug", statusCode: 301 },
        { source: "/winkel/product/:slug", destination: "/product/:slug", statusCode: 301 },
        { source: "/nl/blog/:slug", destination: "/nieuws/:slug", statusCode: 301 },
        { source: "/blog/:slug", destination: "/nieuws/:slug", statusCode: 301 },
        { source: "/brand/:slug([^/.]+)", destination: "/merken", statusCode: 301 },
        { source: "/winkel/:path*", destination: "/shop", statusCode: 301 },
        { source: "/my-account/:path*", destination: "/account", statusCode: 301 },
        { source: "/mijn-account/:path*", destination: "/account", statusCode: 301 },
      ],
    ]);
  },
};

export default nextConfig;
