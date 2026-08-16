import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { BASE } from "./config";

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

export async function ingestProposicoes(
  parlamentarId: string,
  externalId: string,
): Promise<number> {
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
