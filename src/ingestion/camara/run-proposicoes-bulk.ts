import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestProposicoesBulk } from "./proposicoes-bulk";

// Uso: tsx run-proposicoes-bulk.ts <dir> <ano...>
// Espera <dir>/proposicoes-AAAA.csv e <dir>/proposicoesAutores-AAAA.csv
async function main() {
  const dir = process.argv[2];
  const anos = process.argv.slice(3);
  if (!dir || anos.length === 0) {
    console.error("uso: tsx run-proposicoes-bulk.ts <dir> <ano...>");
    process.exit(1);
  }
  // Reconstrói do zero (a autoria é cascade da proposição).
  await prisma.autoria.deleteMany({});
  await prisma.proposicao.deleteMany({});
  console.log("Base de proposições/autorias limpa.");

  for (const ano of anos) {
    const prop = `${dir}/proposicoes-${ano}.csv`;
    const aut = `${dir}/proposicoesAutores-${ano}.csv`;
    const r = await ingestProposicoesBulk(prop, aut);
    console.log(`  ${ano}: ${r.proposicoes} proposições, ${r.autorias} autorias.`);
  }
  console.log("Concluído.");
}

main().finally(() => prisma.$disconnect());
