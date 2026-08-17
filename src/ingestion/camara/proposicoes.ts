import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { BASE } from "./config";
import { anosMandato } from "../../lib/config";

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
  // Escopa ao mandato atual (2023+) e PAGINA — a API devolve no máx. 100 por
  // página; sem paginar, quem propõe muito tinha as recentes cortadas.
  const anoQs = anosMandato().map((a) => `ano=${a}`).join("&");
  const ITENS = 100;
  let pagina = 1;
  let total = 0;

  while (true) {
    const raw = await fetchJson<{ dados: CamaraProposicao[] }>(
      `${BASE}/proposicoes?idDeputadoAutor=${externalId}&${anoQs}&itens=${ITENS}&pagina=${pagina}&ordenarPor=id&ordem=ASC`,
    );
    const props = parseProposicoes(raw);
    for (const p of props) {
      await prisma.proposicao.upsert({
        where: { externalId: p.externalId },
        update: { ementa: p.ementa },
        create: { ...p, parlamentarId },
      });
    }
    total += props.length;
    if (props.length < ITENS) break; // última página
    pagina++;
  }
  return total;
}
