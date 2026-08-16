import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { montarFicha, type Ficha } from "../analysis/ficha";

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

const ANO = 2025;

export async function obterPerfil(id: string): Promise<Perfil | null> {
  const p = await prisma.parlamentar.findUnique({ where: { id } });
  if (!p) return null;

  // Um parlamentar só vota na sua própria casa, portanto o total de votações
  // é escopado por casa (senão a presença ficaria subestimada).
  const [totalVotacoes, presencas, despesas, emendas, totalProposicoes] = await Promise.all([
    prisma.votacao.count({ where: { casa: p.casa } }),
    prisma.votoRegistro.count({ where: { parlamentarId: id, voto: { not: "AUSENTE" } } }),
    prisma.despesa.findMany({ where: { parlamentarId: id, ano: ANO } }),
    prisma.emenda.findMany({ where: { parlamentarId: id } }),
    prisma.proposicao.count({ where: { parlamentarId: id } }),
  ]);

  const totalGasto = despesas.reduce((s, d) => s + d.valor, 0);
  const porFornecedorMap = new Map<string, number>();
  for (const d of despesas) porFornecedorMap.set(d.fornecedorNome, (porFornecedorMap.get(d.fornecedorNome) ?? 0) + d.valor);
  const porFornecedor = [...porFornecedorMap].map(([nome, valor]) => ({ nome, valor }));

  const totalEmendas = emendas.reduce((s, e) => s + e.valorEmpenhado, 0);
  const porMunicipioMap = new Map<string, number>();
  for (const e of emendas)
    if (e.municipioBeneficiario)
      porMunicipioMap.set(e.municipioBeneficiario, (porMunicipioMap.get(e.municipioBeneficiario) ?? 0) + e.valorEmpenhado);
  const porMunicipio = [...porMunicipioMap].map(([municipio, valor]) => ({ municipio, valor }));

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
