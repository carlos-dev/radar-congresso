import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos oficiais: Câmara serve por https; Senado por http (o https redireciona).
    // Liberamos ambos os protocolos para os domínios oficiais.
    remotePatterns: [
      { protocol: "https", hostname: "**.camara.leg.br" },
      { protocol: "http", hostname: "**.camara.leg.br" },
      { protocol: "https", hostname: "**.senado.leg.br" },
      { protocol: "http", hostname: "**.senado.leg.br" },
    ],
  },
};

export default nextConfig;
