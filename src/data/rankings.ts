import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { ANO_REFERENCIA } from "../lib/config";

export interface ItemRanking {
  posicao: number;
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: Casa;
  urlFoto: string | null;
  valor: number;
}

export interface Ranking {
  chave: string;
  titulo: string;
  subtitulo: string;
  unidade: "brl" | "int";
  fonte: string;
  itens: ItemRanking[];
}

type DetalheParlamentar = {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: Casa;
  urlFoto: string | null;
};

/**
 * Top-10 de cada métrica com dado sólido. Presença fica de fora de propósito:
 * há poucos votos nominais ingeridos, ranking seria ruído, não informação.
 */
export async function obterRankings(): Promise<Ranking[]> {
  const [gastoRows, emendaRows, propRows] = await Promise.all([
    prisma.despesa.groupBy({
      by: ["parlamentarId"],
      where: { ano: ANO_REFERENCIA },
      _sum: { valor: true },
      orderBy: { _sum: { valor: "desc" } },
      take: 10,
    }),
    prisma.emenda.groupBy({
      by: ["parlamentarId"],
      _sum: { valorPago: true },
      orderBy: { _sum: { valorPago: "desc" } },
      take: 10,
    }),
    prisma.proposicao.groupBy({
      by: ["parlamentarId"],
      _count: { parlamentarId: true },
      orderBy: { _count: { parlamentarId: "desc" } },
      take: 10,
    }),
  ]);

  const ids = [
    ...new Set([...gastoRows, ...emendaRows, ...propRows].map((r) => r.parlamentarId)),
  ];
  const ps = await prisma.parlamentar.findMany({
    where: { id: { in: ids } },
    select: { id: true, nome: true, partido: true, uf: true, casa: true, urlFoto: true },
  });
  const mapa = new Map<string, DetalheParlamentar>(ps.map((p) => [p.id, p]));

  const monta = (
    rows: { parlamentarId: string }[],
    valorDe: (r: { parlamentarId: string }) => number,
  ): ItemRanking[] => {
    const itens: ItemRanking[] = [];
    for (const r of rows) {
      const d = mapa.get(r.parlamentarId);
      const valor = valorDe(r);
      if (!d || valor <= 0) continue;
      itens.push({ posicao: itens.length + 1, ...d, valor });
    }
    return itens;
  };

  const rankings: Ranking[] = [
    {
      chave: "gasto",
      titulo: "Quem mais gastou a cota parlamentar",
      subtitulo: `Soma da cota (CEAP) em ${ANO_REFERENCIA} · só Câmara`,
      unidade: "brl",
      fonte: "Câmara — CEAP",
      itens: monta(gastoRows, (r) => (r as (typeof gastoRows)[number])._sum.valor ?? 0),
    },
    {
      chave: "emendas",
      titulo: "Quem mais destinou emendas",
      subtitulo: "Soma paga das emendas do parlamentar",
      unidade: "brl",
      fonte: "Portal da Transparência",
      itens: monta(emendaRows, (r) => (r as (typeof emendaRows)[number])._sum.valorPago ?? 0),
    },
    {
      chave: "projetos",
      titulo: "Quem mais apresentou projetos",
      subtitulo: "Proposições de autoria · só Câmara",
      unidade: "int",
      fonte: "Câmara — proposições",
      itens: monta(propRows, (r) => (r as (typeof propRows)[number])._count.parlamentarId),
    },
  ];

  return rankings.filter((r) => r.itens.length > 0);
}
