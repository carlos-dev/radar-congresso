import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";

export interface EmendaNormalizada {
  ano: number;
  funcao: string | null;
  municipioBeneficiario: string | null;
  uf: string | null;
  valorEmpenhado: number;
  valorPago: number;
}

interface TransparenciaEmenda {
  ano: number;
  funcao?: string;
  localidadeDoGasto?: string;
  valorEmpenhado?: string;
  valorPago?: string;
}

function splitLocalidade(loc?: string): { municipio: string | null; uf: string | null } {
  if (!loc) return { municipio: null, uf: null };
  const [municipio, uf] = loc.split(" - ").map((s) => s.trim());
  return { municipio: municipio ?? null, uf: uf ?? null };
}

function parseValor(v?: string | number): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  let s = String(v).trim();
  if (s.includes(",")) {
    // Brazilian format: "." are thousands separators, "," is the decimal
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

export function parseEmendas(raw: TransparenciaEmenda[]): EmendaNormalizada[] {
  return raw.map((e) => {
    const { municipio, uf } = splitLocalidade(e.localidadeDoGasto);
    return {
      ano: e.ano,
      funcao: e.funcao ?? null,
      municipioBeneficiario: municipio,
      uf,
      valorEmpenhado: parseValor(e.valorEmpenhado),
      valorPago: parseValor(e.valorPago),
    };
  });
}

const BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

export async function ingestEmendas(parlamentarId: string, nomeAutor: string, ano: number): Promise<number> {
  const key = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  if (!key) throw new Error("PORTAL_TRANSPARENCIA_API_KEY não configurada");
  const raw = await fetchJson<TransparenciaEmenda[]>(
    `${BASE}/emendas?ano=${ano}&nomeAutor=${encodeURIComponent(nomeAutor)}&pagina=1`,
    { headers: { "chave-api-dados": key } },
  );
  const emendas = parseEmendas(raw);
  await prisma.$transaction([
    prisma.emenda.deleteMany({ where: { parlamentarId, ano } }),
    prisma.emenda.createMany({ data: emendas.map((e) => ({ ...e, parlamentarId })) }),
  ]);
  return emendas.length;
}
