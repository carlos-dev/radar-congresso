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

interface DocumentoRaw {
  favorecido?: { codigoFormatado?: string; nome?: string };
  valor?: string;
}

const PALAVRAS_PUBLICAS = ["PREFEITURA", "MUNICIPIO", "MUNICÍPIO", "ESTADO DE", "FUNDO", "SECRETARIA", "GOVERNO"];

export function parseFavorecidos(raw: DocumentoRaw[], ano: number): FavorecidoNormalizado[] {
  return raw.map((d) => {
    const doc = d.favorecido?.codigoFormatado ?? "";
    const nome = d.favorecido?.nome ?? "";
    const tipoPessoa: "PF" | "PJ" = soDigitos(doc).length > 11 ? "PJ" : "PF";
    const publico = PALAVRAS_PUBLICAS.some((p) => nome.toUpperCase().includes(p));
    return { doc, nome, tipoPessoa, valorPago: Number(d.valor ?? 0), ano, publico };
  });
}

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

export async function ingestFavorecidos(parlamentarId: string, codigoEmenda: string, ano: number): Promise<number> {
  const key = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!key) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não configurada");
  const raw = await fetchJson<DocumentoRaw[]>(
    `${BASE}/emendas/documentos/${encodeURIComponent(codigoEmenda)}?pagina=1`,
    { headers: { "chave-api-dados": key } },
  );
  const favs = parseFavorecidos(raw, ano).filter((f) => !f.publico && f.doc);
  await prisma.favorecido.deleteMany({ where: { parlamentarId, codigoEmenda } });
  await prisma.favorecido.createMany({
    data: favs.map((f) => ({
      parlamentarId, codigoEmenda, doc: f.doc, nome: f.nome, tipoPessoa: f.tipoPessoa,
      valorPago: f.valorPago, ano: f.ano,
    })),
  });
  return favs.length;
}
