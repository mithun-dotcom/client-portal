import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "special-chainsaw-r4j6xg6g9x562x9g6.github.dev",
        "special-chainsaw-r4j6xg6g9x562x9g6-3000.app.github.dev",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;