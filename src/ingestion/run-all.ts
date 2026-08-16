import "dotenv/config";
import { prisma } from "../db/client";
import { ingestDeputados } from "./camara/deputados";
import { ingestDespesas } from "./camara/despesas";
import { ingestVotacoes } from "./camara/votacoes";
import { ingestProposicoes } from "./camara/proposicoes";
import { ingestSenadores } from "./senado/senadores";
import { ingestEmendas } from "./transparencia/emendas";
import { ANO_REFERENCIA } from "../lib/config";

export function ordemDeIngestao(): string[] {
  return ["deputados", "senadores", "despesas", "proposicoes", "votacoes", "emendas"];
}

async function main() {
  console.log("Ingerindo deputados...");
  await ingestDeputados();
  console.log("Ingerindo senadores...");
  await ingestSenadores();

  const camara = await prisma.parlamentar.findMany({ where: { casa: "CAMARA" } });
  for (const dep of camara) {
    await ingestDespesas(dep.id, dep.externalId, ANO_REFERENCIA);
    await ingestProposicoes(dep.id, dep.externalId);
  }

  console.log("Ingerindo votações...");
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), 0, 1).toISOString().slice(0, 10);
  const fim = hoje.toISOString().slice(0, 10);
  await ingestVotacoes(inicio, fim);

  if (process.env.PORTAL_TRANSPARENCIA_API_KEY) {
    console.log("Ingerindo emendas...");
    const todos = await prisma.parlamentar.findMany();
    for (const p of todos) await ingestEmendas(p.id, p.nome, ANO_REFERENCIA).catch(() => 0);
  } else {
    console.log("Pulei emendas (sem PORTAL_TRANSPARENCIA_API_KEY).");
  }

  console.log("Concluído.");
}

if (process.argv[1]?.includes("run-all")) {
  main().finally(() => prisma.$disconnect());
}
