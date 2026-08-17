import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { BASE } from "./config";

export type VotoTipo = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO";

export interface VotoNormalizado {
  externalIdDeputado: string;
  voto: VotoTipo;
}

interface CamaraVoto {
  tipoVoto: string;
  deputado_: { id: number };
}

const MAP: Record<string, VotoTipo> = {
  Sim: "SIM",
  Não: "NAO",
  Nao: "NAO",
  Abstenção: "ABSTENCAO",
  Obstrução: "OBSTRUCAO",
};

export function parseVotos(raw: { dados: CamaraVoto[] }): VotoNormalizado[] {
  return raw.dados
    .filter((v) => MAP[v.tipoVoto])
    .map((v) => ({ externalIdDeputado: String(v.deputado_.id), voto: MAP[v.tipoVoto] }));
}

interface CamaraVotacao {
  id: string;
  data: string;
  descricao: string;
}

export async function ingestVotacoes(dataInicio: string, dataFim: string): Promise<void> {
  const lista = await fetchJson<{ dados: CamaraVotacao[] }>(
    `${BASE}/votacoes?dataInicio=${dataInicio}&dataFim=${dataFim}&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro`,
  );
  for (const v of lista.dados) {
    const votacao = await prisma.votacao.upsert({
      where: { externalId: v.id },
      update: { descricao: v.descricao },
      create: { externalId: v.id, casa: "CAMARA", data: new Date(v.data), descricao: v.descricao },
    });
    const votosRaw = await fetchJson<{ dados: CamaraVoto[] }>(`${BASE}/votacoes/${v.id}/votos`);
    const votos = parseVotos(votosRaw);
    for (const voto of votos) {
      const parlamentar = await prisma.parlamentar.findUnique({
        where: { casa_externalId: { casa: "CAMARA", externalId: voto.externalIdDeputado } },
      });
      if (!parlamentar) continue;
      await prisma.votoRegistro.upsert({
        where: { votacaoId_parlamentarId: { votacaoId: votacao.id, parlamentarId: parlamentar.id } },
        update: { voto: voto.voto },
        create: { votacaoId: votacao.id, parlamentarId: parlamentar.id, voto: voto.voto },
      });
    }
  }
}
