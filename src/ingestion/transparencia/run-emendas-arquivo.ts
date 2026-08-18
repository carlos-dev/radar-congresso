import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestEmendasArquivo, ingestFavorecidosArquivo } from "./emendas-arquivo";

// Uso: tsx run-emendas-arquivo.ts <dir>
// Espera <dir>/EmendasParlamentares.csv e <dir>/EmendasParlamentares_PorFavorecido.csv
async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("uso: tsx run-emendas-arquivo.ts <dir>");
    process.exit(1);
  }
  console.log("Ingerindo emendas (individuais, mandato)...");
  const nE = await ingestEmendasArquivo(`${dir}/EmendasParlamentares.csv`);
  console.log(`  ${nE} emendas.`);
  console.log("Ingerindo favorecidos...");
  const nF = await ingestFavorecidosArquivo(`${dir}/EmendasParlamentares_PorFavorecido.csv`);
  console.log(`  ${nF} favorecidos.`);
  console.log("Concluído.");
}

main().finally(() => prisma.$disconnect());
