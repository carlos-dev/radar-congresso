import { prisma } from "../db/client";
import { scoreImportancia } from "../analysis/importancia";

export interface Pauta {
  id: string;
  casa: string;
  data: Date;
  titulo: string;
  resumoCidadao: string | null;
  significadoSim: string | null;
  significadoNao: string | null;
  secreta: boolean;
  revisada: boolean;
}
export interface VotoDoParlamentar { id: string; nome: string; partido: string | null; uf: string | null; casa: string }

export async function pautasQueImportam(limite = 20): Promise<Pauta[]> {
  const vs = await prisma.votacao.findMany({
    where: { votos: { some: {} }, NOT: { destaque: false } },
    select: {
      id: true, casa: true, data: true, descricao: true, titulo: true, destaque: true,
      resumoCidadao: true, significadoSim: true, significadoNao: true, secreta: true, legibilidadeRevisada: true,
      tipo: true, votosSim: true, votosNao: true, votosOutros: true,
    },
  });
  return vs
    .map((v) => ({ v, score: (v.destaque ? 1 : 0) + scoreImportancia(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ v }) => ({
      id: v.id, casa: v.casa, data: v.data, titulo: v.titulo ?? v.descricao.slice(0, 90),
      resumoCidadao: v.resumoCidadao, significadoSim: v.significadoSim, significadoNao: v.significadoNao,
      secreta: v.secreta, revisada: v.legibilidadeRevisada,
    }));
}

export async function votosPorUf(votacaoIds: string[], uf: string): Promise<Record<string, Record<string, VotoDoParlamentar[]>>> {
  const regs = await prisma.votoRegistro.findMany({
    where: { votacaoId: { in: votacaoIds }, parlamentar: { uf } },
    select: { votacaoId: true, voto: true, parlamentar: { select: { id: true, nome: true, partido: true, uf: true, casa: true } } },
  });
  const out: Record<string, Record<string, VotoDoParlamentar[]>> = {};
  for (const id of votacaoIds) out[id] = {};
  for (const r of regs) {
    (out[r.votacaoId][r.voto] ??= []).push(r.parlamentar);
  }
  return out;
}
