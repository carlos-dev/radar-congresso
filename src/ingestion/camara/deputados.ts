import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { BASE } from "./config";

export interface DeputadoNormalizado {
  externalId: string;
  casa: "CAMARA";
  nome: string;
  partido: string | null;
  uf: string | null;
  urlFoto: string | null;
}

interface CamaraDeputado {
  id: number;
  nome: string;
  siglaPartido?: string;
  siglaUf?: string;
  urlFoto?: string;
}

export function parseDeputados(raw: { dados: CamaraDeputado[] }): DeputadoNormalizado[] {
  return raw.dados.map((d) => ({
    externalId: String(d.id),
    casa: "CAMARA" as const,
    nome: d.nome,
    partido: d.siglaPartido ?? null,
    uf: d.siglaUf ?? null,
    urlFoto: d.urlFoto ?? null,
  }));
}

export async function ingestDeputados(): Promise<number> {
  let pagina = 1;
  let total = 0;
  // A API pagina em blocos de 100; seguimos até uma página vir incompleta/vazia.
  while (true) {
    const raw = await fetchJson<{ dados: CamaraDeputado[] }>(
      `${BASE}/deputados?ordem=ASC&ordenarPor=nome&itens=100&pagina=${pagina}`,
    );
    const deputados = parseDeputados(raw);
    if (deputados.length === 0) break;
    for (const d of deputados) {
      await prisma.parlamentar.upsert({
        where: { casa_externalId: { casa: "CAMARA", externalId: d.externalId } },
        update: { nome: d.nome, partido: d.partido, uf: d.uf, urlFoto: d.urlFoto },
        create: d,
      });
    }
    total += deputados.length;
    if (deputados.length < 100) break;
    pagina++;
  }
  return total;
}
