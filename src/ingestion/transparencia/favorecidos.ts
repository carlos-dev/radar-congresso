import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";

export interface FavorecidoNormalizado {
  doc: string;
  nome: string;
  tipoPessoa: "PF" | "PJ";
  valorPago: number;
  ano: number;
  publico: boolean;
}

// Detalhe de um documento de despesa (2º pulo): traz o favorecido real.
interface DespesaDocumentoRaw {
  codigoFavorecido?: string;
  nomeFavorecido?: string;
  valor?: string | number;
  fase?: string;
}

// Documento ligado à emenda (1º pulo): metadados do empenho/liquidação.
interface EmendaDocumentoRaw {
  codigoDocumento?: string;
  fase?: string;
}

const PALAVRAS_PUBLICAS = [
  "PREFEITURA", "MUNICIPIO", "MUNICÍPIO", "ESTADO DE", "FUNDO", "SECRETARIA",
  "GOVERNO", "UNIVERSIDADE", "INSTITUTO FEDERAL", "CAMARA MUNICIPAL", "CÂMARA MUNICIPAL",
];

function parseValor(v?: string | number): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  let s = String(v).trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

// Normaliza UM documento de despesa em um favorecido. Retorna null sem CNPJ/CPF.
export function parseFavorecido(raw: DespesaDocumentoRaw, ano: number): FavorecidoNormalizado | null {
  const doc = raw.codigoFavorecido ?? "";
  const nome = raw.nomeFavorecido ?? "";
  if (!doc) return null;
  const tipoPessoa: "PF" | "PJ" = soDigitos(doc).length > 11 ? "PJ" : "PF";
  const publico = PALAVRAS_PUBLICAS.some((p) => nome.toUpperCase().includes(p));
  return { doc, nome, tipoPessoa, valorPago: parseValor(raw.valor), ano, publico };
}

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Rastreia os favorecidos PRIVADOS de uma emenda em dois pulos:
// 1) /emendas/documentos/{codigoEmenda}  -> documentos de empenho
// 2) /despesas/documentos/{codigoDocumento} -> favorecido (CNPJ/CPF)
// `maxDocs` limita quantos empenhos consultar (controle de custo/rate limit).
export async function ingestFavorecidos(
  parlamentarId: string,
  codigoEmenda: string,
  ano: number,
  maxDocs = 5,
): Promise<number> {
  const key = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!key) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não configurada");
  const headers = { "chave-api-dados": key };

  const docs = await fetchJson<EmendaDocumentoRaw[]>(
    `${BASE}/emendas/documentos/${encodeURIComponent(codigoEmenda)}?pagina=1`,
    { headers },
  ).catch(() => [] as EmendaDocumentoRaw[]);

  const empenhos = docs
    .filter((d) => d.codigoDocumento && (!d.fase || d.fase.toUpperCase().includes("EMPENHO")))
    .slice(0, maxDocs);

  const favs: FavorecidoNormalizado[] = [];
  for (const e of empenhos) {
    await sleep(800); // respiro entre chamadas ao Portal
    const det = await fetchJson<DespesaDocumentoRaw>(
      `${BASE}/despesas/documentos/${encodeURIComponent(e.codigoDocumento as string)}`,
      { headers },
    ).catch(() => null);
    if (!det) continue;
    const f = parseFavorecido(det, ano);
    if (f && !f.publico) favs.push(f);
  }

  await prisma.favorecido.deleteMany({ where: { parlamentarId, codigoEmenda } });
  if (favs.length) {
    await prisma.favorecido.createMany({
      data: favs.map((f) => ({
        parlamentarId, codigoEmenda, doc: f.doc, nome: f.nome, tipoPessoa: f.tipoPessoa,
        valorPago: f.valorPago, ano: f.ano,
      })),
    });
  }
  return favs.length;
}
