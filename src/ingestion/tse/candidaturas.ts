import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";
import { parseCsvObjetos } from "../../lib/csv";

const CARGOS_FEDERAIS = new Set(["DEPUTADO FEDERAL", "SENADOR"]);

// TSE usa tokens como "#NE", "#NULO#", "#NE#" para campos ainda não
// determinados (ex.: candidatura registrada mas não julgada). Viram vazio.
function limpaToken(v: string): string {
  const s = (v ?? "").trim();
  return s.startsWith("#") ? "" : s;
}

export interface CandidaturaTSE {
  sqCandidato: string;
  cpf: string;
  ano: number;
  cargo: string;
  situacao: string; // DS_SITUACAO_CANDIDATURA
  resultado: string; // DS_SIT_TOT_TURNO
}

/** Parseia consulta_cand_AAAA_BRASIL.csv, só cargos federais. */
export function parseCandidaturas(csv: string): CandidaturaTSE[] {
  const out: CandidaturaTSE[] = [];
  for (const r of parseCsvObjetos(csv)) {
    const cargo = r["DS_CARGO"];
    if (!CARGOS_FEDERAIS.has(cargo)) continue;
    out.push({
      sqCandidato: r["SQ_CANDIDATO"],
      cpf: soDigitos(r["NR_CPF_CANDIDATO"]),
      ano: Number(r["ANO_ELEICAO"]) || 0,
      cargo,
      situacao: limpaToken(r["DS_SITUACAO_CANDIDATURA"]),
      resultado: limpaToken(r["DS_SIT_TOT_TURNO"]),
    });
  }
  return out;
}

function valorBR(v: string): number {
  const n = Number((v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

/** Parseia bem_candidato_AAAA_BRASIL.csv → soma do patrimônio por SQ_CANDIDATO. */
export function parseBensPorCandidato(csv: string): Map<string, number> {
  const soma = new Map<string, number>();
  for (const r of parseCsvObjetos(csv)) {
    const sq = r["SQ_CANDIDATO"];
    if (!sq) continue;
    soma.set(sq, (soma.get(sq) ?? 0) + valorBR(r["VR_BEM_CANDIDATO"]));
  }
  return soma;
}

/**
 * Ingere candidatura (elegibilidade) + patrimônio declarado de um ano, casando
 * por CPF do candidato (que temos completo para deputados). Idempotente por
 * (parlamentar, ano).
 */
export async function ingestCandidaturas(
  candCsvPath: string,
  bensCsvPath: string,
): Promise<number> {
  const [candCsv, bensCsv] = await Promise.all([
    readFile(candCsvPath, "latin1"),
    readFile(bensCsvPath, "latin1"),
  ]);

  const candidaturas = parseCandidaturas(candCsv);
  const bensPorSq = parseBensPorCandidato(bensCsv);

  const parlamentares = await prisma.parlamentar.findMany({ where: { cpf: { not: null } } });
  const porCpf = new Map<string, string>();
  for (const p of parlamentares) porCpf.set(soDigitos(p.cpf as string), p.id);

  let n = 0;
  for (const c of candidaturas) {
    const pid = porCpf.get(c.cpf);
    if (!pid) continue;
    const patrimonio = bensPorSq.get(c.sqCandidato) ?? 0;
    await prisma.candidatura.upsert({
      where: { parlamentarId_ano: { parlamentarId: pid, ano: c.ano } },
      update: { cargo: c.cargo, situacao: c.situacao, resultado: c.resultado, patrimonio },
      create: {
        parlamentarId: pid, ano: c.ano, cargo: c.cargo,
        situacao: c.situacao, resultado: c.resultado, patrimonio,
      },
    });
    n++;
  }
  return n;
}
