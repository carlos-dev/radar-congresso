import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.camara.leg.br" },
      { protocol: "https", hostname: "**.senado.leg.br" },
    ],
  },
};

export default nextConfig;
