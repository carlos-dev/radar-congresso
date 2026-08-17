import { prisma } from "../db/client";

export interface CotaDetalhe {
  total: number;
  fornecedores: { nome: string; doc: string | null; total: number; qtd: number }[];
}

export async function detalheCota(parlamentarId: string, ano: number): Promise<CotaDetalhe> {
  const grupos = await prisma.despesa.groupBy({
    by: ["fornecedorNome", "fornecedorDoc"],
    where: { parlamentarId, ano },
    _sum: { valor: true },
    _count: { _all: true },
    orderBy: { _sum: { valor: "desc" } },
    take: 50,
  });
  const agg = await prisma.despesa.aggregate({ where: { parlamentarId, ano }, _sum: { valor: true } });
  return {
    total: agg._sum.valor ?? 0,
    fornecedores: grupos.map((g) => ({
      nome: g.fornecedorNome,
      doc: g.fornecedorDoc,
      total: g._sum.valor ?? 0,
      qtd: g._count._all,
    })),
  };
}

export interface ProjetosPagina {
  total: number;
  itens: { tipo: string; ano: number; ementa: string }[];
}

export async function listaProjetos(parlamentarId: string, pagina = 1): Promise<ProjetosPagina> {
  const [total, itens] = await Promise.all([
    prisma.proposicao.count({ where: { parlamentarId } }),
    prisma.proposicao.findMany({
      where: { parlamentarId },
      select: { tipo: true, ano: true, ementa: true },
      orderBy: [{ ano: "desc" }],
      skip: (pagina - 1) * 30,
      take: 30,
    }),
  ]);
  return { total, itens };
}

export interface VotacaoDetalhe {
  descricao: string;
  data: Date;
  voto: string;
}

export async function listaVotacoes(parlamentarId: string): Promise<VotacaoDetalhe[]> {
  const votos = await prisma.votoRegistro.findMany({
    where: { parlamentarId },
    include: { votacao: { select: { descricao: true, data: true } } },
    orderBy: { votacao: { data: "desc" } },
    take: 100,
  });
  return votos.map((v) => ({ descricao: v.votacao.descricao, data: v.votacao.data, voto: v.voto }));
}

export async function listaEmendas(
  parlamentarId: string,
): Promise<{ nome: string; doc: string; total: number }[]> {
  const grupos = await prisma.favorecido.groupBy({
    by: ["nome", "doc"],
    where: { parlamentarId },
    _sum: { valorPago: true },
    orderBy: { _sum: { valorPago: "desc" } },
    take: 50,
  });
  return grupos.map((g) => ({ nome: g.nome, doc: g.doc, total: g._sum.valorPago ?? 0 }));
}
