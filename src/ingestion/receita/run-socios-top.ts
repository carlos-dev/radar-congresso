import "dotenv/config";
import { prisma } from "../../db/client";
import { enrichSocios } from "./socios";
import { soDigitos } from "../../lib/texto";

// Busca o QSA (sócios) dos maiores beneficiários de emenda (PJ), por valor
// recebido. Bounded por N (default 3000) para não estourar a BrasilAPI.
// Uso: tsx run-socios-top.ts [N]
const N = Number(process.argv[2]) || 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const grupos = await prisma.favorecido.groupBy({
    by: ["doc"],
    where: { tipoPessoa: "PJ" },
    _sum: { valorPago: true },
    orderBy: { _sum: { valorPago: "desc" } },
    take: N * 2,
  });
  const cnpjs = grupos.map((g) => g.doc).filter((d) => soDigitos(d).length === 14).slice(0, N);
  console.log(`Buscando sócios de ${cnpjs.length} CNPJs (top por valor recebido)...`);

  let consultados = 0;
  let comSocio = 0;
  for (let i = 0; i < cnpjs.length; i++) {
    try {
      const n = await enrichSocios(cnpjs[i]);
      if (n > 0) comSocio++;
      consultados++;
    } catch {
      /* uma falha não aborta o lote */
    }
    if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${cnpjs.length} (com sócio: ${comSocio})`);
    await sleep(350);
  }
  console.log(`Concluído: ${consultados} CNPJs consultados, ${comSocio} com sócios.`);
}

main().finally(() => prisma.$disconnect());
