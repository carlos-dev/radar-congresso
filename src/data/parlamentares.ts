import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { montarFicha, type Ficha } from "../analysis/ficha";
import { ANO_REFERENCIA } from "../lib/config";

// Soma `valueFn` agrupando por `keyFn`, preservando a ordem de primeira
// aparição das chaves. Retorna as entradas [chave, soma].
function groupSum<T>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => number,
): [string, number][] {
  const soma = new Map<string, number>();
  for (const item of items) {
    const chave = keyFn(item);
    soma.set(chave, (soma.get(chave) ?? 0) + valueFn(item));
  }
  return [...soma];
}

export interface ParlamentarResumo {
  id: string;
  nome: string;
  partido: string | null;
  uf: string | null;
  casa: Casa;
  urlFoto: string | null;
}

export async function listarParlamentares(busca?: string): Promise<ParlamentarResumo[]> {
  return prisma.parlamentar.findMany({
    where: busca ? { nome: { contains: busca, mode: "insensitive" } } : undefined,
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, partido: true, uf: true, casa: true, urlFoto: true },
    take: 100,
  });
}

export interface Perfil extends ParlamentarResumo {
  ficha: Ficha;
}

export async function obterPerfil(id: string): Promise<Perfil | null> {
  const p = await prisma.parlamentar.findUnique({ where: { id } });
  if (!p) return null;

  // Um parlamentar só vota na sua própria casa, portanto o total de votações
  // é escopado por casa (senão a presença ficaria subestimada).
  const [totalVotacoes, presencas, despesas, emendas, totalProposicoes] = await Promise.all([
    prisma.votacao.count({ where: { casa: p.casa } }),
    prisma.votoRegistro.count({ where: { parlamentarId: id, voto: { not: "AUSENTE" } } }),
    prisma.despesa.findMany({ where: { parlamentarId: id, ano: ANO_REFERENCIA } }),
    prisma.emenda.findMany({ where: { parlamentarId: id } }),
    prisma.proposicao.count({ where: { parlamentarId: id } }),
  ]);

  const totalGasto = despesas.reduce((s, d) => s + d.valor, 0);
  const porFornecedor = groupSum(despesas, (d) => d.fornecedorNome, (d) => d.valor)
    .map(([nome, valor]) => ({ nome, valor }));

  const totalEmendas = emendas.reduce((s, e) => s + e.valorEmpenhado, 0);
  const comMunicipio = emendas.filter((e) => e.municipioBeneficiario);
  const porMunicipio = groupSum(comMunicipio, (e) => e.municipioBeneficiario!, (e) => e.valorEmpenhado)
    .map(([municipio, valor]) => ({ municipio, valor }));

  // NOTE: as médias de pares são constantes de arranque (0.9 de presença,
  // R$300k de gasto, 20 proposições). Calcular as médias reais a partir do
  // banco é uma fatia futura.
  const ficha = montarFicha({
    presenca: { totalVotacoes, presencas, mediaPresencaPares: 0.9 },
    despesas: { totalGasto, mediaGastoPares: 300000, porFornecedor },
    emendas: { total: totalEmendas, porMunicipio },
    legislativa: { totalProposicoes, mediaProposicoesPares: 20 },
  });

  return {
    id: p.id, nome: p.nome, partido: p.partido, uf: p.uf, casa: p.casa, urlFoto: p.urlFoto, ficha,
  };
}
