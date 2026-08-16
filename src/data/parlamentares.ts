import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { montarFicha, type Ficha } from "../analysis/ficha";
import type { Nivel } from "../analysis/types";
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

// Dados agregados brutos de UM parlamentar, prontos para montar a ficha.
// Compartilhado por `obterPerfil` (query por id) e `listarComRadar` (batched),
// garantindo montagem idêntica da ficha nos dois caminhos.
interface AgregadosParlamentar {
  totalVotacoesCasa: number;
  presencas: number;
  despesas: { fornecedorNome: string; valor: number }[];
  emendas: { municipioBeneficiario: string | null; valorEmpenhado: number }[];
  totalProposicoes: number;
}

function fichaDeAgregados(a: AgregadosParlamentar): Ficha {
  const totalGasto = a.despesas.reduce((s, d) => s + d.valor, 0);
  const porFornecedor = groupSum(a.despesas, (d) => d.fornecedorNome, (d) => d.valor)
    .map(([nome, valor]) => ({ nome, valor }));

  const totalEmendas = a.emendas.reduce((s, e) => s + e.valorEmpenhado, 0);
  const comMunicipio = a.emendas.filter((e) => e.municipioBeneficiario);
  const porMunicipio = groupSum(comMunicipio, (e) => e.municipioBeneficiario!, (e) => e.valorEmpenhado)
    .map(([municipio, valor]) => ({ municipio, valor }));

  // NOTE: as médias de pares são constantes de arranque (0.9 de presença,
  // R$300k de gasto, 20 proposições). Calcular médias reais é fatia futura.
  return montarFicha({
    presenca: { totalVotacoes: a.totalVotacoesCasa, presencas: a.presencas, mediaPresencaPares: 0.9 },
    despesas: { totalGasto, mediaGastoPares: 300000, porFornecedor },
    emendas: { total: totalEmendas, porMunicipio },
    legislativa: { totalProposicoes: a.totalProposicoes, mediaProposicoesPares: 20 },
  });
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

  const ficha = fichaDeAgregados({
    totalVotacoesCasa: totalVotacoes,
    presencas,
    despesas,
    emendas,
    totalProposicoes,
  });

  return {
    id: p.id, nome: p.nome, partido: p.partido, uf: p.uf, casa: p.casa, urlFoto: p.urlFoto, ficha,
  };
}

// Ordem de severidade — mesma usada por `pior` em analysis/ficha.ts.
// Maior índice = mais severo (alerta antes de atencao).
const SEVERIDADE: Nivel[] = ["sem_dado", "ok", "atencao", "alerta"];

export type FiltroRadar = "todos" | "camara" | "senado" | "alerta";

export interface ListarComRadarOpts {
  busca?: string;
  filtro?: FiltroRadar;
}

/**
 * Lista parlamentares já com a ficha (radar) montada, usando agregações em
 * lote — sem uma query por parlamentar dentro de um loop.
 */
export async function listarComRadar(opts: ListarComRadarOpts = {}): Promise<Perfil[]> {
  const busca = opts.busca?.trim();
  const filtro = opts.filtro ?? "todos";

  const andWhere: Record<string, unknown>[] = [];
  if (busca) {
    andWhere.push({
      OR: [
        { nome: { contains: busca, mode: "insensitive" } },
        { partido: { contains: busca, mode: "insensitive" } },
        { uf: { contains: busca, mode: "insensitive" } },
      ],
    });
  }
  if (filtro === "camara") andWhere.push({ casa: "CAMARA" });
  if (filtro === "senado") andWhere.push({ casa: "SENADO" });
  const where = andWhere.length ? { AND: andWhere } : undefined;

  const ps = await prisma.parlamentar.findMany({
    where,
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, partido: true, uf: true, casa: true, urlFoto: true },
    take: 100,
  });
  if (ps.length === 0) return [];

  const ids = ps.map((p) => p.id);

  // Agregações em lote sobre parlamentarId in ids.
  const [votacaoPorCasaRows, presencaRows, despesasAll, emendasAll, proposicaoRows] =
    await Promise.all([
      prisma.votacao.groupBy({ by: ["casa"], _count: { _all: true } }),
      prisma.votoRegistro.groupBy({
        by: ["parlamentarId"],
        where: { parlamentarId: { in: ids }, voto: { not: "AUSENTE" } },
        _count: { _all: true },
      }),
      prisma.despesa.findMany({
        where: { parlamentarId: { in: ids }, ano: ANO_REFERENCIA },
        select: { parlamentarId: true, fornecedorNome: true, valor: true },
      }),
      prisma.emenda.findMany({
        where: { parlamentarId: { in: ids } },
        select: { parlamentarId: true, municipioBeneficiario: true, valorEmpenhado: true },
      }),
      prisma.proposicao.groupBy({
        by: ["parlamentarId"],
        where: { parlamentarId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

  const votacaoPorCasa = new Map<Casa, number>();
  for (const r of votacaoPorCasaRows) votacaoPorCasa.set(r.casa, r._count._all);

  const presMap = new Map<string, number>();
  for (const r of presencaRows) presMap.set(r.parlamentarId, r._count._all);

  const propMap = new Map<string, number>();
  for (const r of proposicaoRows) propMap.set(r.parlamentarId, r._count._all);

  const despesasPorId = new Map<string, { fornecedorNome: string; valor: number }[]>();
  for (const d of despesasAll) {
    const arr = despesasPorId.get(d.parlamentarId);
    if (arr) arr.push(d);
    else despesasPorId.set(d.parlamentarId, [d]);
  }

  const emendasPorId = new Map<
    string,
    { municipioBeneficiario: string | null; valorEmpenhado: number }[]
  >();
  for (const e of emendasAll) {
    const arr = emendasPorId.get(e.parlamentarId);
    if (arr) arr.push(e);
    else emendasPorId.set(e.parlamentarId, [e]);
  }

  const perfis: Perfil[] = ps.map((p) => {
    const ficha = fichaDeAgregados({
      totalVotacoesCasa: votacaoPorCasa.get(p.casa) ?? 0,
      presencas: presMap.get(p.id) ?? 0,
      despesas: despesasPorId.get(p.id) ?? [],
      emendas: emendasPorId.get(p.id) ?? [],
      totalProposicoes: propMap.get(p.id) ?? 0,
    });
    return { ...p, ficha };
  });

  if (filtro === "alerta") {
    return perfis
      .filter((p) => p.ficha.nivelGeral === "alerta" || p.ficha.nivelGeral === "atencao")
      .sort(
        (a, b) =>
          SEVERIDADE.indexOf(b.ficha.nivelGeral) - SEVERIDADE.indexOf(a.ficha.nivelGeral),
      );
  }

  return perfis;
}
