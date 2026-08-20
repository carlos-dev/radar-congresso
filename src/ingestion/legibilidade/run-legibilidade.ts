import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../db/client";
import { montarPromptLegibilidade, parseLegibilidade } from "../../analysis/legibilidade";

const client = new Anthropic();
const resultadoDe = (d: string) => (/^aprovad/i.test(d) ? "aprovada" : /^rejeitad/i.test(d) ? "rejeitada" : null);

async function main() {
  // apenas as que serão exibidas (destaque != false), não secretas, ainda sem legibilidade
  const vs = await prisma.votacao.findMany({
    where: { NOT: { destaque: false }, resumoCidadao: null, secreta: false, votos: { some: {} } },
    select: { id: true, descricao: true, tipo: true },
    take: 200,
  });
  console.log(`Gerando legibilidade para ${vs.length} votações...`);
  let ok = 0;
  for (const v of vs) {
    const prompt = montarPromptLegibilidade({ descricao: v.descricao, tipo: v.tipo, resultado: resultadoDe(v.descricao) });
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });
    const texto = resp.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const leg = parseLegibilidade(texto);
    if (leg) { await prisma.votacao.update({ where: { id: v.id }, data: leg }); ok++; }
    else console.warn(`legibilidade inválida para ${v.id}`);
  }
  console.log(`Concluído: ${ok}/${vs.length} com legibilidade.`);
}

main().finally(() => prisma.$disconnect());
