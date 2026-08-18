import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { parseCsvObjetos } from "../../lib/csv";

// Situações do arquivo em massa que indicam que a proposição virou lei/norma.
// "Transformado em Norma Jurídica" cobre leis e emendas constitucionais;
// incluímos variações e promulgação por segurança. NÃO conta "transformado em
// nova proposição" (isso é fusão, não virou lei).
const VIROU_LEI = /transformad[oa] em (norma jur|lei|emenda)|promulgad|convertid[oa] em lei/i;

/** IDs (externalId) das proposições que viraram lei/norma, do arquivo em massa. */
export function parseVirouLeiIds(csv: string): string[] {
  const ids: string[] = [];
  for (const r of parseCsvObjetos(csv)) {
    if (VIROU_LEI.test(r["ultimoStatus_descricaoSituacao"] ?? "")) ids.push(r["id"]);
  }
  return ids;
}

/**
 * Marca virouLei=true nas proposições que constam como transformadas em norma
 * no arquivo proposicoes-AAAA.csv. Idempotente. Só afeta o que já está no banco
 * (as proposições do mandato, atribuídas por autoria).
 */
export async function enrichVirouLei(csvPath: string): Promise<number> {
  const csv = await readFile(csvPath, "utf8");
  const ids = parseVirouLeiIds(csv);
  let n = 0;
  const LOTE = 1000;
  for (let i = 0; i < ids.length; i += LOTE) {
    const chunk = ids.slice(i, i + LOTE);
    const r = await prisma.proposicao.updateMany({
      where: { externalId: { in: chunk } },
      data: { virouLei: true },
    });
    n += r.count;
  }
  return n;
}
