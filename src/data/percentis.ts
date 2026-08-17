import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { ANO_REFERENCIA } from "../lib/config";

export interface PercentisParlamentar {
  /** Fração de colegas que faltaram MENOS (0..1). Maior = pior. */
  presenca: number;
  /** Fração de colegas que gastaram MENOS (0..1). Maior = pior. */
  gasto: number;
  /** Fração de colegas que produziram MAIS (0..1). Maior = pior. */
  proposicoes: number;
}

export const PERCENTIS_ZERO: PercentisParlamentar = { presenca: 0, gasto: 0, proposicoes: 0 };

/**
 * Para cada parlamentar da casa, calcula o percentil "ruim" de cada métrica
 * (posição relativa aos pares da MESMA casa). Uma passada de agregações por
 * casa — sem query por parlamentar.
 */
export async function calcularPercentisCasa(casa: Casa): Promise<Map<string, PercentisParlamentar>> {
  const out = new Map<string, PercentisParlamentar>();
  const parlamentares = await prisma.parlamentar.findMany({ where: { casa }, select: { id: true } });
  const ids = parlamentares.map((p) => p.id);
  const N = ids.length;
  if (N === 0) return out;

  const totalNominais = await prisma.votacao.count({ where: { casa, votos: { some: {} } } });

  const [presRows, gastoRows, propRows] = await Promise.all([
    prisma.votoRegistro.groupBy({
      by: ["parlamentarId"],
      where: { parlamentarId: { in: ids }, voto: { not: "AUSENTE" } },
      _count: { _all: true },
    }),
    prisma.despesa.groupBy({
      by: ["parlamentarId"],
      where: { parlamentarId: { in: ids }, ano: ANO_REFERENCIA },
      _sum: { valor: true },
    }),
    prisma.proposicao.groupBy({
      by: ["parlamentarId"],
      where: { parlamentarId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const presCount = new Map<string, number>();
  for (const r of presRows) presCount.set(r.parlamentarId, r._count._all);
  const gastoMap = new Map<string, number>();
  for (const r of gastoRows) gastoMap.set(r.parlamentarId, r._sum.valor ?? 0);
  const propMap = new Map<string, number>();
  for (const r of propRows) propMap.set(r.parlamentarId, r._count._all);

  const taxa = (id: string) => (totalNominais > 0 ? (presCount.get(id) ?? 0) / totalNominais : 0);
  const valGasto = (id: string) => gastoMap.get(id) ?? 0;
  const valProp = (id: string) => propMap.get(id) ?? 0;

  const taxas = ids.map(taxa);
  const gastos = ids.map(valGasto);
  const props = ids.map(valProp);

  const fracMaior = (arr: number[], v: number) => arr.filter((x) => x > v).length / N;
  const fracMenor = (arr: number[], v: number) => arr.filter((x) => x < v).length / N;

  for (const id of ids) {
    out.set(id, {
      presenca: fracMaior(taxas, taxa(id)), // faltou mais que quem tem taxa maior
      gasto: fracMenor(gastos, valGasto(id)), // gastou mais que quem gastou menos
      proposicoes: fracMaior(props, valProp(id)), // produziu menos que quem produziu mais
    });
  }
  return out;
}
