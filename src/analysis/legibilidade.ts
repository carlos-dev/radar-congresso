export interface LegibilidadeInput {
  descricao: string;
  tipo: string | null;
  resultado: string | null;
  titulo?: string | null;
}
export interface Legibilidade { resumoCidadao: string; significadoSim: string; significadoNao: string }

export function montarPromptLegibilidade(i: LegibilidadeInput): string {
  return [
    "Você traduz votações do Congresso para linguagem cidadã simples, sem juridiquês.",
    "Baseie-se APENAS no título e no texto oficial abaixo. NÃO invente o assunto: se o tema" +
      " não estiver claro, descreva de forma geral (ex.: 'uma mudança na Constituição') sem" +
      " chutar a matéria. Nunca invente a direção do voto.",
    i.titulo ? `Título (assunto real desta votação): ${i.titulo}` : "",
    `Tipo: ${i.tipo ?? "?"} | Resultado: ${i.resultado ?? "?"}`,
    `Texto oficial: """${i.descricao}"""`,
    'Responda SÓ com JSON: {"resumoCidadao": "1-2 frases do que a matéria trata", ' +
      '"significadoSim": "o que votar Sim representou", "significadoNao": "o que votar Não representou"}',
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseLegibilidade(raw: string): Legibilidade | null {
  // Tenta o bloco cercado (```json ... ```) primeiro — mais confiável que o
  // match ganancioso de chaves, que quebra se houver prosa com "{" em volta.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const brace = raw.match(/\{[\s\S]*\}/);
  for (const cand of [fence?.[1], brace?.[0]]) {
    if (!cand) continue;
    try {
      const o = JSON.parse(cand);
      const ok = ["resumoCidadao", "significadoSim", "significadoNao"].every(
        (k) => typeof o[k] === "string" && o[k].trim(),
      );
      if (ok) {
        return { resumoCidadao: o.resumoCidadao.trim(), significadoSim: o.significadoSim.trim(), significadoNao: o.significadoNao.trim() };
      }
    } catch {
      /* tenta o próximo candidato */
    }
  }
  return null;
}
