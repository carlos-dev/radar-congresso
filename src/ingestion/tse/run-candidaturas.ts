import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestCandidaturas } from "./candidaturas";

// Uso: tsx run-candidaturas.ts <dir> <ano...>
// Espera <dir>/consulta_cand_AAAA/consulta_cand_AAAA_BRASIL.csv
//    e   <dir>/bem_candidato_AAAA/bem_candidato_AAAA_BRASIL.csv
async function main() {
  const dir = process.argv[2];
  const anos = process.argv.slice(3);
  if (!dir || anos.length === 0) {
    console.error("uso: tsx run-candidaturas.ts <dir> <ano...>");
    process.exit(1);
  }
  for (const ano of anos) {
    const cand = `${dir}/consulta_cand_${ano}/consulta_cand_${ano}_BRASIL.csv`;
    const bens = `${dir}/bem_candidato_${ano}/bem_candidato_${ano}_BRASIL.csv`;
    console.log(`Ingerindo candidaturas ${ano}...`);
    const n = await ingestCandidaturas(cand, bens);
    console.log(`  ${ano}: ${n} candidaturas casadas.`);
  }
}

main().finally(() => prisma.$disconnect());
