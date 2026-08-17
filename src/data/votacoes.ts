import { prisma } from "../db/client";
import { scoreImportancia } from "../analysis/importancia";

export interface VotacaoDestaque {
  id: string;
  externalId: string;
  data: Date;
  tipo: string | null;
  titulo: string;
  resultado: "aprovada" | "rejeitada" | null;
  votosSim: number | null;
  votosNao: number | null;
  curada: boolean;
}

/** Versão curta e sem juridiquês da descrição oficial (fallback do título). */
export function limpaDescricao(desc: string): string {
  // tira o sufixo de placar "Sim: x; Não: y; Total: z."
  let s = desc.replace(/\s*Sim\s*:\s*\d+.*$/i, "").trim();
  const ponto = s.indexOf(". ");
  if (ponto > 40) s = s.slice(0, ponto);
  return s.length > 140 ? s.slice(0, 137).trimEnd() + "…" : s;
}

function resultadoDe(desc: string): "aprovada" | "rejeitada" | null {
  const d = desc.trim().toLowerCase();
  if (d.startsWith("aprovad")) return "aprovada";
  if (d.startsWith("rejeitad")) return "rejeitada";
  return null;
}

/**
 * Votações "que importam" — híbrido: a curadoria (destaque=true) vem primeiro,
 * o resto é ordenado pela heurística de relevância. destaque=false é excluído.
 */
export async function votacoesEmDestaque(limite = 10): Promise<VotacaoDestaque[]> {
  const vs = await prisma.votacao.findMany({
    where: { casa: "CAMARA", votos: { some: {} } },
    select: {
      id: true, externalId: true, data: true, tipo: true, titulo: true,
      descricao: true, destaque: true, votosSim: true, votosNao: true, votosOutros: true,
    },
  });

  return vs
    .filter((v) => v.destaque !== false)
    .map((v) => ({
      v,
      // curadas (destaque=true) sobem para o topo; demais pela heurística.
      score: (v.destaque === true ? 1 : 0) + scoreImportancia(v),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ v }) => ({
      id: v.id,
      externalId: v.externalId,
      data: v.data,
      tipo: v.tipo,
      titulo: v.titulo ?? limpaDescricao(v.descricao),
      resultado: resultadoDe(v.descricao),
      votosSim: v.votosSim,
      votosNao: v.votosNao,
      curada: v.destaque === true,
    }));
}

export type VotoEm = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO" | "AUSENTE";

/** Como o parlamentar votou em cada votação (ausente = sem registro). */
export async function comoVotou(
  parlamentarId: string,
  votacaoIds: string[],
): Promise<Map<string, VotoEm>> {
  const regs = await prisma.votoRegistro.findMany({
    where: { parlamentarId, votacaoId: { in: votacaoIds } },
    select: { votacaoId: true, voto: true },
  });
  const m = new Map<string, VotoEm>();
  for (const id of votacaoIds) m.set(id, "AUSENTE");
  for (const r of regs) m.set(r.votacaoId, r.voto as VotoEm);
  return m;
}
