/** @type {import("next").NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
    imageSizes: [48, 64, 80, 96, 128, 256, 384, 400],
    remotePatterns: [
      { protocol: "https", hostname: "**.bergasports.com" },
      { protocol: "https", hostname: "www.bergasports.com" },
      { protocol: "https", hostname: "**.prisma.io" },
    ],
  },
  async redirects() {
    return [
      {
        source: "/room-match",
        destination: "/shop",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
