import "dotenv/config";
import { prisma } from "../../db/client";
import { enrichVirouLei } from "./proposicoes-status";

// Uso: tsx run-proposicoes-status.ts <dir> <ano...>
// Espera <dir>/proposicoes-AAAA.csv (arquivo em massa da Câmara).
async function main() {
  const dir = process.argv[2];
  const anos = process.argv.slice(3);
  if (!dir || anos.length === 0) {
    console.error("uso: tsx run-proposicoes-status.ts <dir> <ano...>");
    process.exit(1);
  }
  let total = 0;
  for (const ano of anos) {
    const n = await enrichVirouLei(`${dir}/proposicoes-${ano}.csv`);
    console.log(`  ${ano}: ${n} proposições marcadas como lei/norma.`);
    total += n;
  }
  console.log(`Concluído: ${total} proposições marcadas virouLei.`);
}

main().finally(() => prisma.$disconnect());
