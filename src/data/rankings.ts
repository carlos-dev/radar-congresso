import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { ANO_REFERENCIA } from "../lib/config";
import { TIPOS_PROJETO } from "../lib/proposicoes";

export interface ItemRanking {
  posicao: number;
  id: string;
  externalId: string;
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
  unidade: "brl" | "int" | "pct";
  fonte: string;
  itens: ItemRanking[];
}

type DetalheParlamentar = {
  id: string;
  externalId: string;
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
  const [gastoRows, emendaRows, propRows, totalVotacoes, presencaRows] = await Promise.all([
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
    prisma.autoria.groupBy({
      by: ["parlamentarId"],
      where: { principal: true, proposicao: { tipo: { in: TIPOS_PROJETO } } },
      _count: { parlamentarId: true },
      orderBy: { _count: { parlamentarId: "desc" } },
      take: 10,
    }),
    prisma.votacao.count({ where: { casa: "CAMARA", votos: { some: {} } } }),
    prisma.votoRegistro.groupBy({ by: ["parlamentarId"], _count: { _all: true } }),
  ]);

  // Faltas = fração de votações de plenário sem voto registrado. Sem dados de
  // posse/licença, não dá para distinguir um faltoso de um suplente/ministro
  // licenciado. Para não acusar injustamente, só rankeamos quem esteve
  // presente em ao menos 70% das votações (titular claramente ativo) — entre
  // esses, quem mais faltou.
  const PISO_PRESENCA = 0.7;
  const faltasTop = totalVotacoes
    ? presencaRows
        .filter((r) => r._count._all >= totalVotacoes * PISO_PRESENCA)
        .map((r) => ({
          parlamentarId: r.parlamentarId,
          taxa: (totalVotacoes - r._count._all) / totalVotacoes,
        }))
        .filter((x) => x.taxa > 0)
        .sort((a, b) => b.taxa - a.taxa)
        .slice(0, 10)
    : [];

  const ids = [
    ...new Set(
      [...gastoRows, ...emendaRows, ...propRows, ...faltasTop].map((r) => r.parlamentarId),
    ),
  ];
  const ps = await prisma.parlamentar.findMany({
    where: { id: { in: ids } },
    select: { id: true, externalId: true, nome: true, partido: true, uf: true, casa: true, urlFoto: true },
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
      chave: "faltas",
      titulo: "Quem mais faltou às votações",
      subtitulo: "Entre titulares presentes em ≥70% das votações de plenário (2023–2025)",
      unidade: "pct",
      fonte: "Câmara — votações",
      itens: monta(faltasTop, (r) => (r as (typeof faltasTop)[number]).taxa),
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
      subtitulo: "Proposições como autor principal · só Câmara",
      unidade: "int",
      fonte: "Câmara — proposições",
      itens: monta(propRows, (r) => (r as (typeof propRows)[number])._count.parlamentarId),
    },
  ];

  return rankings.filter((r) => r.itens.length > 0);
}
