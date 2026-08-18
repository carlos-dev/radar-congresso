import { prisma } from "../db/client";

export interface CotaDetalhe {
  ano: number;
  total: number;
  numFornecedores: number;
  /** Gasto por mês (12 entradas, mes 1..12) — para o gráfico temporal. */
  porMes: { mes: number; total: number }[];
  fornecedores: { nome: string; doc: string | null; total: number; qtd: number }[];
}

export async function detalheCota(parlamentarId: string, ano: number): Promise<CotaDetalhe> {
  const where = { parlamentarId, ano };
  const [grupos, agg, mesesRows, distintos] = await Promise.all([
    prisma.despesa.groupBy({
      by: ["fornecedorNome", "fornecedorDoc"],
      where,
      _sum: { valor: true },
      _count: { _all: true },
      orderBy: { _sum: { valor: "desc" } },
      take: 50,
    }),
    prisma.despesa.aggregate({ where, _sum: { valor: true } }),
    prisma.despesa.groupBy({ by: ["mes"], where, _sum: { valor: true } }),
    prisma.despesa.findMany({
      where,
      select: { fornecedorNome: true, fornecedorDoc: true },
      distinct: ["fornecedorNome", "fornecedorDoc"],
    }),
  ]);

  const somaMes = new Map<number, number>();
  for (const m of mesesRows) somaMes.set(m.mes, m._sum.valor ?? 0);
  const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: somaMes.get(i + 1) ?? 0 }));

  return {
    ano,
    total: agg._sum.valor ?? 0,
    numFornecedores: distintos.length,
    porMes,
    fornecedores: grupos.map((g) => ({
      nome: g.fornecedorNome,
      doc: g.fornecedorDoc,
      total: g._sum.valor ?? 0,
      qtd: g._count._all,
    })),
  };
}

export interface ProjetosPagina {
  principal: { total: number; virouLei: number };
  coautor: { total: number; virouLei: number };
  totalItens: number;
  porAno: { ano: number; total: number }[];
  itens: { tipo: string; ano: number; ementa: string; virouLei: boolean; principal: boolean }[];
}

export async function listaProjetos(parlamentarId: string, pagina = 1): Promise<ProjetosPagina> {
  const [pTotal, pLei, cTotal, cLei, porAnoRows, autorias] = await Promise.all([
    prisma.autoria.count({ where: { parlamentarId, principal: true } }),
    prisma.autoria.count({ where: { parlamentarId, principal: true, proposicao: { virouLei: true } } }),
    prisma.autoria.count({ where: { parlamentarId, principal: false } }),
    prisma.autoria.count({ where: { parlamentarId, principal: false, proposicao: { virouLei: true } } }),
    prisma.proposicao.groupBy({
      by: ["ano"],
      where: { autorias: { some: { parlamentarId } } },
      _count: { _all: true },
      orderBy: { ano: "asc" },
    }),
    prisma.autoria.findMany({
      where: { parlamentarId },
      select: { principal: true, proposicao: { select: { tipo: true, ano: true, ementa: true, virouLei: true } } },
      orderBy: [{ proposicao: { ano: "desc" } }],
      skip: (pagina - 1) * 30,
      take: 30,
    }),
  ]);
  return {
    principal: { total: pTotal, virouLei: pLei },
    coautor: { total: cTotal, virouLei: cLei },
    totalItens: pTotal + cTotal,
    porAno: porAnoRows.map((r) => ({ ano: r.ano, total: r._count._all })),
    itens: autorias.map((a) => ({
      tipo: a.proposicao.tipo,
      ano: a.proposicao.ano,
      ementa: a.proposicao.ementa,
      virouLei: a.proposicao.virouLei,
      principal: a.principal,
    })),
  };
}

export interface VotacoesDetalhe {
  total: number;
  resumo: { voto: string; qtd: number }[];
  itens: { descricao: string; data: Date; voto: string }[];
}

export async function listaVotacoes(parlamentarId: string): Promise<VotacoesDetalhe> {
  const [resumoRows, votos] = await Promise.all([
    prisma.votoRegistro.groupBy({
      by: ["voto"],
      where: { parlamentarId },
      _count: { _all: true },
    }),
    prisma.votoRegistro.findMany({
      where: { parlamentarId },
      include: { votacao: { select: { descricao: true, data: true } } },
      orderBy: { votacao: { data: "desc" } },
      take: 100,
    }),
  ]);
  const total = resumoRows.reduce((s, r) => s + r._count._all, 0);
  return {
    total,
    resumo: resumoRows.map((r) => ({ voto: r.voto, qtd: r._count._all })),
    itens: votos.map((v) => ({ descricao: v.votacao.descricao, data: v.votacao.data, voto: v.voto })),
  };
}

export interface EmendasDetalhe {
  total: number;
  numBeneficiarios: number;
  porAno: { ano: number; total: number }[];
  beneficiarios: { nome: string; doc: string; total: number; ano: number }[];
}

export async function listaEmendas(parlamentarId: string): Promise<EmendasDetalhe> {
  const [grupos, porAnoRows, agg, distintos] = await Promise.all([
    prisma.favorecido.groupBy({
      by: ["nome", "doc", "ano"],
      where: { parlamentarId },
      _sum: { valorPago: true },
      orderBy: { _sum: { valorPago: "desc" } },
      take: 50,
    }),
    prisma.favorecido.groupBy({
      by: ["ano"],
      where: { parlamentarId },
      _sum: { valorPago: true },
      orderBy: { ano: "asc" },
    }),
    prisma.favorecido.aggregate({ where: { parlamentarId }, _sum: { valorPago: true } }),
    prisma.favorecido.findMany({ where: { parlamentarId }, select: { doc: true }, distinct: ["doc"] }),
  ]);
  return {
    total: agg._sum.valorPago ?? 0,
    numBeneficiarios: distintos.length,
    porAno: porAnoRows.map((r) => ({ ano: r.ano, total: r._sum.valorPago ?? 0 })),
    beneficiarios: grupos.map((g) => ({
      nome: g.nome,
      doc: g.doc,
      total: g._sum.valorPago ?? 0,
      ano: g.ano,
    })),
  };
}
