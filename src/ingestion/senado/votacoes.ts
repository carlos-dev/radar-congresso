import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

const BASE = "https://legis.senado.leg.br/dadosabertos";

export type VotoTipoSenado = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO" | "SIGILOSO";

export interface VotacaoSenado {
  externalId: string;
  data: Date;
  descricao: string;
  secreta: boolean;
  votos: { codigoParlamentar: string; voto: VotoTipoSenado }[];
}

const MAP: Record<string, VotoTipoSenado> = {
  Sim: "SIM", "Não": "NAO", Nao: "NAO", Abstenção: "ABSTENCAO", Abstencao: "ABSTENCAO",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseVotacoesSenado(json: any): VotacaoSenado[] {
  const lista = json?.ListaVotacoes?.Votacoes?.Votacao ?? [];
  const arr = Array.isArray(lista) ? lista : [lista];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((v: any) => {
    const secreta = v.Secreta === "S";
    const votosRaw = v?.Votos?.VotoParlamentar ?? [];
    const votosArr = Array.isArray(votosRaw) ? votosRaw : [votosRaw];
    return {
      externalId: String(v.CodigoSessaoVotacao),
      data: new Date(v.DataSessao),
      descricao: v.DescricaoVotacao ?? "",
      secreta,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      votos: votosArr.map((p: any) => ({
        codigoParlamentar: String(p.CodigoParlamentar),
        voto: secreta ? ("SIGILOSO" as const) : (MAP[String(p.Voto).trim()] ?? "ABSTENCAO"),
      })),
    };
  });
}

export async function ingestVotacoesSenado(
  dataInicio: string,
  dataFim: string,
): Promise<{ votacoes: number; votos: number }> {
  const raw = await fetchJson<unknown>(
    `${BASE}/plenario/lista/votacao/${dataInicio}/${dataFim}`,
    { headers: { Accept: "application/json" } },
  );
  const votacoes = parseVotacoesSenado(raw);
  const senadores = await prisma.parlamentar.findMany({
    where: { casa: "SENADO" },
    select: { id: true, externalId: true },
  });
  const pidPorExternal = new Map(senadores.map((s) => [s.externalId, s.id]));

  let totalVotos = 0;
  for (const v of votacoes) {
    const votacao = await prisma.votacao.upsert({
      where: { externalId: v.externalId },
      update: { descricao: v.descricao, data: v.data, secreta: v.secreta },
      create: { externalId: v.externalId, casa: "SENADO", data: v.data, descricao: v.descricao, secreta: v.secreta },
    });
    await prisma.votoRegistro.deleteMany({ where: { votacaoId: votacao.id } });
    const regs = v.votos
      .map((x) => ({ votacaoId: votacao.id, parlamentarId: pidPorExternal.get(x.codigoParlamentar), voto: x.voto }))
      .filter(
        (r): r is { votacaoId: string; parlamentarId: string; voto: (typeof v.votos)[number]["voto"] } =>
          Boolean(r.parlamentarId),
      );
    if (regs.length) {
      await prisma.votoRegistro.createMany({ data: regs, skipDuplicates: true });
      totalVotos += regs.length;
    }
  }
  return { votacoes: votacoes.length, votos: totalVotos };
}
