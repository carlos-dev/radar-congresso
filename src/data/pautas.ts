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

export async function pautasQueImportam(limite = 15): Promise<Pauta[]> {
  // secretas ficam de fora (não dá pra mostrar como cada um votou). Excluir
  // destaque=false via filtro em JS — `NOT: { destaque: false }` no Prisma
  // descartaria também os `null` (heurística), que são a maioria.
  const vs = (
    await prisma.votacao.findMany({
      where: { votos: { some: {} }, secreta: false },
      select: {
        id: true, casa: true, data: true, descricao: true, titulo: true, destaque: true,
        resumoCidadao: true, significadoSim: true, significadoNao: true, secreta: true, legibilidadeRevisada: true,
        tipo: true, votosSim: true, votosNao: true, votosOutros: true,
      },
    })
  ).filter((v) => v.destaque !== false);

  // Cota por casa: a Câmara tem muito mais votações de placar apertado e
  // dominaria o topo. Reservamos espaço para o Senado (o cidadão tem deputados
  // E senadores) — cada casa entra com suas mais relevantes.
  const camaraN = Math.ceil(limite * 0.7);
  const senadoN = limite - camaraN;
  const scored = vs
    .map((v) => ({ v, score: (v.destaque ? 1 : 0) + scoreImportancia(v) }))
    .sort((a, b) => b.score - a.score);
  const camara = scored.filter((x) => x.v.casa === "CAMARA").slice(0, camaraN);
  const senado = scored.filter((x) => x.v.casa === "SENADO").slice(0, senadoN);
  return [...camara, ...senado]
    .sort((a, b) => b.score - a.score)
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
