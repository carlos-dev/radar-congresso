import "dotenv/config";
import { prisma } from "../../db/client";
import { CURADORIA_VOTACOES } from "../../data/curadoria-votacoes";

// Aplica a curadoria manual (destaque/titulo) por externalId. Idempotente:
// pode rodar quantas vezes quiser; não é tocada pela reingestão de votações.
async function main() {
  let ok = 0;
  for (const o of CURADORIA_VOTACOES) {
    const r = await prisma.votacao.updateMany({
      where: { externalId: o.externalId },
      data: { destaque: o.destaque ?? null, titulo: o.titulo ?? null },
    });
    if (r.count > 0) ok++;
    else console.warn(`  não encontrei votação ${o.externalId}`);
  }
  console.log(`Curadoria aplicada: ${ok}/${CURADORIA_VOTACOES.length} votações.`);
}

main().finally(() => prisma.$disconnect());
