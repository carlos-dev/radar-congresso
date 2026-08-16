import "dotenv/config";
import { existsSync } from "node:fs";
import { prisma } from "../db/client";
import { ingestDeputados } from "./camara/deputados";
import { ingestDespesas } from "./camara/despesas";
import { ingestVotacoes } from "./camara/votacoes";
import { ingestProposicoes } from "./camara/proposicoes";
import { ingestSenadores } from "./senado/senadores";
import { ingestEmendas } from "./transparencia/emendas";
import { ingestDoacoes } from "./tse/doacoes";
import { ingestFavorecidos } from "./transparencia/favorecidos";
import { enrichSocios } from "./receita/socios";
import { obterConexoes } from "../data/investigacao";
import { ANO_REFERENCIA } from "../lib/config";

export function ordemDeIngestao(): string[] {
  return [
    "deputados", "senadores", "despesas", "proposicoes", "votacoes", "emendas",
    "doacoes", "favorecidos", "socios", "conexoes",
  ];
}

// Respiro entre chamadas ao Portal da Transparência para não estourar o
// rate limit (~90 req/min em horário comercial) e sermos bloqueados.
const PORTAL_DELAY_MS = 800;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    for (const p of todos) {
      await ingestEmendas(p.id, p.nome, ANO_REFERENCIA).catch(() => 0);
      await sleep(PORTAL_DELAY_MS);
    }
  } else {
    console.log("Pulei emendas (sem PORTAL_TRANSPARENCIA_API_KEY).");
  }

  console.log("Concluído.");
}

// Segunda fase (dados investigativos): doações TSE, favorecidos de emenda,
// sócios (BrasilAPI, sob demanda) e o cruzamento em Conexao. Cada fase é
// isolada em try/catch para não abortar as demais.
async function mainInvestigacao() {
  try {
    for (const ano of ["2022", "2018"]) {
      const csv = `data/tse/receitas_${ano}.csv`;
      if (existsSync(csv)) {
        console.log(`Ingerindo doações ${ano}...`);
        await ingestDoacoes(csv);
      } else {
        console.log(`Pulei doações ${ano} (CSV ausente: ${csv}).`);
      }
    }
  } catch (err) {
    console.warn(`Falha em doações: ${(err as Error).message}`);
  }

  try {
    const emendas = await prisma.emenda.findMany({ where: { codigoEmenda: { not: null } } });
    console.log(`Ingerindo favorecidos de ${emendas.length} emendas...`);
    for (const e of emendas) {
      await ingestFavorecidos(e.parlamentarId, e.codigoEmenda as string, e.ano).catch(() => 0);
      await sleep(PORTAL_DELAY_MS);
    }
  } catch (err) {
    console.warn(`Falha em favorecidos: ${(err as Error).message}`);
  }

  try {
    const favs = await prisma.favorecido.findMany({ where: { tipoPessoa: "PJ" }, select: { doc: true } });
    const docs = [...new Set(favs.map((f) => f.doc))];
    console.log(`Buscando sócios de ${docs.length} CNPJs...`);
    for (const doc of docs) await enrichSocios(doc).catch(() => 0);
  } catch (err) {
    console.warn(`Falha em sócios: ${(err as Error).message}`);
  }

  try {
    const parlamentares = await prisma.parlamentar.findMany({
      where: { doacoes: { some: {} }, favorecidos: { some: {} } },
      select: { id: true },
    });
    console.log(`Calculando conexões de ${parlamentares.length} parlamentares...`);
    for (const p of parlamentares) {
      const cx = await obterConexoes(p.id);
      await prisma.conexao.deleteMany({ where: { parlamentarId: p.id } });
      if (cx.length) {
        await prisma.conexao.createMany({
          data: cx.map((c) => ({
            parlamentarId: p.id,
            tipo: c.tipo,
            doadorNome: c.doadorNome,
            doadorDoc: c.doadorDoc,
            empresaCnpj: c.empresaCnpj,
            empresaNome: c.empresaNome,
            valorDoacao: c.valorDoacao,
            valorEmenda: c.valorEmenda,
            ano: c.ano,
            confianca: c.confianca,
          })),
        });
      }
    }
  } catch (err) {
    console.warn(`Falha em conexões: ${(err as Error).message}`);
  }

  console.log("Investigação concluída.");
}

if (process.argv[1]?.includes("run-all")) {
  const alvo = process.argv[2] === "investigacao" ? mainInvestigacao : main;
  alvo().finally(() => prisma.$disconnect());
}
