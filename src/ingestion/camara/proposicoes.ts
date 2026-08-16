import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface ProposicaoNormalizada {
  externalId: string;
  tipo: string;
  ano: number;
  ementa: string;
  virouLei: boolean;
}

interface CamaraProposicao {
  id: number;
  siglaTipo: string;
  ano: number;
  ementa: string;
}

export function parseProposicoes(raw: { dados: CamaraProposicao[] }): ProposicaoNormalizada[] {
  return raw.dados.map((p) => ({
    externalId: String(p.id),
    tipo: p.siglaTipo,
    ano: p.ano,
    ementa: p.ementa,
    virouLei: false,
  }));
}

const BASE = "https://dadosabertos.camara.leg.br/api/v2";

export async function ingestProposicoes(parlamentarId: string, externalId: string) {
  const raw = await fetchJson<{ dados: CamaraProposicao[] }>(
    `${BASE}/proposicoes?idDeputadoAutor=${externalId}&itens=100`,
  );
  const props = parseProposicoes(raw);
  for (const p of props) {
    await prisma.proposicao.upsert({
      where: { externalId: p.externalId },
      update: { ementa: p.ementa },
      create: { ...p, parlamentarId },
    });
  }
  return props.length;
}
