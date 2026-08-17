import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestVotacoesArquivo } from "./votacoes-arquivo";

// Uso: tsx run-votacoes-arquivo.ts <dir> <ano...>
// Espera arquivos <dir>/votacoes-AAAA.csv e <dir>/votacoesVotos-AAAA.csv.
async function main() {
  const dir = process.argv[2];
  const anos = process.argv.slice(3);
  if (!dir || anos.length === 0) {
    console.error("uso: tsx run-votacoes-arquivo.ts <dir> <ano...>");
    process.exit(1);
  }
  for (const ano of anos) {
    const meta = `${dir}/votacoes-${ano}.csv`;
    const votos = `${dir}/votacoesVotos-${ano}.csv`;
    console.log(`Ingerindo votações ${ano}...`);
    const r = await ingestVotacoesArquivo(meta, votos);
    console.log(`  ${ano}: ${r.votacoes} votações de plenário, ${r.votos} votos.`);
  }
}

main().finally(() => prisma.$disconnect());
