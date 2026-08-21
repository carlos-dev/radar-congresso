import type { MetadataRoute } from "next";
import { prisma } from "@/db/client";
import { slugParlamentar } from "@/lib/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/como-votaram`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/rankings`, changeFrequency: "weekly", priority: 0.8 },
  ];

  try {
    const parls = await prisma.parlamentar.findMany({ select: { nome: true, externalId: true } });
    const perfis: MetadataRoute.Sitemap = parls.map((p) => ({
      url: `${SITE_URL}/parlamentar/${slugParlamentar(p.nome, p.externalId)}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
    return [...estaticas, ...perfis];
  } catch {
    // Se o banco estiver indisponível no build, ainda geramos as rotas estáticas.
    return estaticas;
  }
}
