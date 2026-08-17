import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";

export interface SocioNormalizado {
  cnpj: string;
  nome: string;
  doc: string;
}

interface BrasilApiCnpj {
  cnpj: string;
  razao_social?: string;
  qsa?: { nome_socio: string; cnpj_cpf_do_socio: string }[];
}

export function parseSocios(raw: BrasilApiCnpj): SocioNormalizado[] {
  const cnpj = soDigitos(raw.cnpj);
  return (raw.qsa ?? []).map((s) => ({ cnpj, nome: s.nome_socio, doc: s.cnpj_cpf_do_socio }));
}

export async function enrichSocios(cnpjFormatado: string): Promise<number> {
  const cnpj = soDigitos(cnpjFormatado);
  if (!cnpj) return 0;
  const jaTem = await prisma.socio.count({ where: { cnpj } });
  if (jaTem > 0) return jaTem;

  // A BrasilAPI (via CDN) responde 403 sem User-Agent — o fetch do Node não
  // envia um por padrão, então definimos um explicitamente.
  const raw = await fetchJson<BrasilApiCnpj>(
    `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
    { retries: 2, delayMs: 800, headers: { "User-Agent": "radar-congresso/1.0" } },
  ).catch(() => null);
  if (!raw) return 0;

  const socios = parseSocios(raw);
  for (const s of socios) {
    await prisma.socio.upsert({
      where: { cnpj_doc_nome: { cnpj: s.cnpj, doc: s.doc, nome: s.nome } },
      update: {},
      create: s,
    });
  }
  return socios.length;
}
