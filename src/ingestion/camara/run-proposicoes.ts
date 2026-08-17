import "dotenv/config";
import { prisma } from "../../db/client";
import { ingestProposicoes } from "./proposicoes";
import { ANO_MANDATO_INICIO } from "../../lib/config";

// Re-ingere proposições do mandato atual (paginado) para todos os deputados e
// remove as de legislaturas anteriores (comparação de produção fica justa).
async function main() {
  const removidas = await prisma.proposicao.deleteMany({ where: { ano: { lt: ANO_MANDATO_INICIO } } });
  console.log(`Removidas ${removidas.count} proposições anteriores a ${ANO_MANDATO_INICIO}.`);

  const deputados = await prisma.parlamentar.findMany({
    where: { casa: "CAMARA" },
    select: { id: true, externalId: true, nome: true },
  });
  let i = 0;
  let total = 0;
  for (const d of deputados) {
    i++;
    try {
      const n = await ingestProposicoes(d.id, d.externalId);
      total += n;
      if (i % 50 === 0) console.log(`  [${i}/${deputados.length}] parcial: ${total} proposições`);
    } catch (err) {
      console.warn(`  falhou ${d.nome} (${d.externalId}): ${(err as Error).message}`);
    }
  }
  console.log(`Concluído: ${total} proposições do mandato ingeridas.`);
}

main().finally(() => prisma.$disconnect());
