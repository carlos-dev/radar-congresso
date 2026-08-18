import { prisma } from "../db/client";
import type { Casa } from "@prisma/client";
import { montarFicha, type Ficha } from "../analysis/ficha";
import type { Nivel } from "../analysis/types";
import { ANO_REFERENCIA } from "../lib/config";
import {
  calcularPercentisCasa,
  PERCENTIS_ZERO,
  type PercentisParlamentar,
} from "./percentis";
import { TIPOS_PROJETO } from "../lib/proposicoes";

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
  beneficiarios: { nome: string; valorPago: number }[];
  totalProposicoes: number;
  // Posição relativa aos pares da mesma casa (0..1, maior = pior).
  percentis: PercentisParlamentar;
}

function fichaDeAgregados(a: AgregadosParlamentar): Ficha {
  const totalGasto = a.despesas.reduce((s, d) => s + d.valor, 0);
  const porFornecedor = groupSum(a.despesas, (d) => d.fornecedorNome, (d) => d.valor)
    .map(([nome, valor]) => ({ nome, valor }));

  const totalEmendas = a.beneficiarios.reduce((s, b) => s + b.valorPago, 0);
  const porBeneficiario = groupSum(a.beneficiarios, (b) => b.nome, (b) => b.valorPago)
    .map(([nome, valor]) => ({ nome, valor }));

  // Os limiares de nível usam o percentil REAL do parlamentar frente aos pares
  // da mesma casa (calculado em `calcularPercentisCasa`), não mais constantes.
  return montarFicha({
    presenca: { totalVotacoes: a.totalVotacoesCasa, presencas: a.presencas, percentilRuim: a.percentis.presenca },
    despesas: { totalGasto, percentilRuim: a.percentis.gasto, porFornecedor },
    emendas: { total: totalEmendas, porBeneficiario },
    legislativa: { totalProposicoes: a.totalProposicoes, percentilRuim: a.percentis.proposicoes },
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

  // Presença só faz sentido sobre votações NOMINAIS (com voto individual
  // registrado). A maioria das "votações" da Câmara é simbólica/sem voto
  // registrado; contá-las inflaria as "faltas" de todo mundo. Escopamos por
  // casa (parlamentar só vota na sua) e exigimos ao menos um voto registrado.
  const [totalVotacoes, presencas, despesas, beneficiarios, totalProposicoes, percentisCasa] =
    await Promise.all([
      prisma.votacao.count({ where: { casa: p.casa, votos: { some: {} } } }),
      prisma.votoRegistro.count({ where: { parlamentarId: id, voto: { not: "AUSENTE" } } }),
      prisma.despesa.findMany({ where: { parlamentarId: id, ano: ANO_REFERENCIA } }),
      prisma.favorecido.findMany({ where: { parlamentarId: id }, select: { nome: true, valorPago: true } }),
      prisma.autoria.count({ where: { parlamentarId: id, principal: true, proposicao: { tipo: { in: TIPOS_PROJETO } } } }),
      calcularPercentisCasa(p.casa),
    ]);

  const ficha = fichaDeAgregados({
    totalVotacoesCasa: totalVotacoes,
    presencas,
    despesas,
    beneficiarios,
    totalProposicoes,
    percentis: percentisCasa.get(id) ?? PERCENTIS_ZERO,
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
  // Percentis são relativos a TODA a casa, não só aos 100 do resultado; por
  // isso calculamos por casa presente (não por `ids`).
  const casasPresentes = [...new Set(ps.map((p) => p.casa))];

  // Agregações em lote sobre parlamentarId in ids.
  const [votacaoPorCasaRows, presencaRows, despesasAll, beneficiariosAll, proposicaoRows, percentisPorCasa] =
    await Promise.all([
      prisma.votacao.groupBy({ by: ["casa"], where: { votos: { some: {} } }, _count: { _all: true } }),
      prisma.votoRegistro.groupBy({
        by: ["parlamentarId"],
        where: { parlamentarId: { in: ids }, voto: { not: "AUSENTE" } },
        _count: { _all: true },
      }),
      prisma.despesa.findMany({
        where: { parlamentarId: { in: ids }, ano: ANO_REFERENCIA },
        select: { parlamentarId: true, fornecedorNome: true, valor: true },
      }),
      prisma.favorecido.findMany({
        where: { parlamentarId: { in: ids } },
        select: { parlamentarId: true, nome: true, valorPago: true },
      }),
      prisma.autoria.groupBy({
        by: ["parlamentarId"],
        where: { parlamentarId: { in: ids }, principal: true, proposicao: { tipo: { in: TIPOS_PROJETO } } },
        _count: { _all: true },
      }),
      Promise.all(casasPresentes.map((c) => calcularPercentisCasa(c))),
    ]);

  // Une os mapas por casa num só (chaveado por parlamentarId).
  const percentisMap = new Map<string, PercentisParlamentar>();
  for (const mapa of percentisPorCasa) {
    for (const [pid, perc] of mapa) percentisMap.set(pid, perc);
  }

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

  const beneficiariosPorId = new Map<string, { nome: string; valorPago: number }[]>();
  for (const b of beneficiariosAll) {
    const arr = beneficiariosPorId.get(b.parlamentarId);
    if (arr) arr.push(b);
    else beneficiariosPorId.set(b.parlamentarId, [b]);
  }

  const perfis: Perfil[] = ps.map((p) => {
    const ficha = fichaDeAgregados({
      totalVotacoesCasa: votacaoPorCasa.get(p.casa) ?? 0,
      presencas: presMap.get(p.id) ?? 0,
      despesas: despesasPorId.get(p.id) ?? [],
      beneficiarios: beneficiariosPorId.get(p.id) ?? [],
      totalProposicoes: propMap.get(p.id) ?? 0,
      percentis: percentisMap.get(p.id) ?? PERCENTIS_ZERO,
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
