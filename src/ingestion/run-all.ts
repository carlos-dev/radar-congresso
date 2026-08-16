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
  console.log(`Ingerindo despesas e proposições de ${camara.length} deputados...`);
  let i = 0;
  for (const dep of camara) {
    i++;
    // Um deputado com dado atípico não pode abortar a ingestão inteira.
    try {
      await ingestDespesas(dep.id, dep.externalId, ANO_REFERENCIA);
      await ingestProposicoes(dep.id, dep.externalId);
    } catch (err) {
      console.warn(`  [${i}/${camara.length}] falhou ${dep.nome} (${dep.externalId}): ${(err as Error).message}`);
    }
  }

  // A API de votações da Câmara rejeita intervalos maiores que 3 meses,
  // então usamos uma janela dos últimos ~89 dias (presença recente).
  console.log("Ingerindo votações (últimos ~3 meses)...");
  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - 89 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fim = hoje.toISOString().slice(0, 10);
  try {
    await ingestVotacoes(inicio, fim);
  } catch (err) {
    console.warn(`Falha ao ingerir votações: ${(err as Error).message}`);
  }

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
