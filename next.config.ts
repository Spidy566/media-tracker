import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "pg"],
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
    ],
  },
};

export default nextConfig;