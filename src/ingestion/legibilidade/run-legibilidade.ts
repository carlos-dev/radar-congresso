import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../../db/client";
import { montarPromptLegibilidade, parseLegibilidade } from "../../analysis/legibilidade";
import { pautasQueImportam } from "../../data/pautas";

const client = new Anthropic();
const resultadoDe = (d: string) => (/^aprovad/i.test(d) ? "aprovada" : /^rejeitad/i.test(d) ? "rejeitada" : null);

async function main() {
  // Traduz exatamente as pautas que a feature exibe (evita o pitfall de NULL de
  // filtrar destaque via Prisma). Buffer amplo além do que a página mostra.
  const pautas = await pautasQueImportam(40);
  const vs = await prisma.votacao.findMany({
    where: { id: { in: pautas.map((p) => p.id) }, resumoCidadao: null },
    select: { id: true, descricao: true, tipo: true, titulo: true },
  });
  console.log(`Gerando legibilidade para ${vs.length} votações...`);
  let ok = 0;
  for (const v of vs) {
    const prompt = montarPromptLegibilidade({ descricao: v.descricao, tipo: v.tipo, resultado: resultadoDe(v.descricao), titulo: v.titulo });
    // O LLM às vezes devolve algo não-parseável; re-tenta algumas vezes.
    let leg = null;
    for (let tentativa = 0; tentativa < 3 && !leg; tentativa++) {
      const resp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        // Prefill "{" força o modelo a emitir o JSON direto, sem preâmbulo do
        // tipo "entendi, pode enviar a votação".
        messages: [
          { role: "user", content: prompt },
          { role: "assistant", content: "{" },
        ],
      });
      const texto = "{" + resp.content.map((c) => (c.type === "text" ? c.text : "")).join("");
      leg = parseLegibilidade(texto);
    }
    if (leg) { await prisma.votacao.update({ where: { id: v.id }, data: leg }); ok++; }
    else console.warn(`legibilidade inválida (3 tentativas) para ${v.id}`);
  }
  console.log(`Concluído: ${ok}/${vs.length} com legibilidade.`);
}

main().finally(() => prisma.$disconnect());
