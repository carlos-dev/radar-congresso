export interface LegibilidadeInput { descricao: string; tipo: string | null; resultado: string | null }
export interface Legibilidade { resumoCidadao: string; significadoSim: string; significadoNao: string }

export function montarPromptLegibilidade(i: LegibilidadeInput): string {
  return [
    "Você traduz votações do Congresso para linguagem cidadã simples, sem juridiquês.",
    "Baseie-se APENAS no texto oficial abaixo. Não invente fatos nem a direção do voto.",
    `Tipo: ${i.tipo ?? "?"} | Resultado: ${i.resultado ?? "?"}`,
    `Texto oficial: """${i.descricao}"""`,
    'Responda SÓ com JSON: {"resumoCidadao": "1-2 frases do que a matéria trata", ' +
      '"significadoSim": "o que votar Sim representou", "significadoNao": "o que votar Não representou"}',
  ].join("\n");
}

export function parseLegibilidade(raw: string): Legibilidade | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]);
    const ok = ["resumoCidadao", "significadoSim", "significadoNao"].every(
      (k) => typeof o[k] === "string" && o[k].trim(),
    );
    return ok
      ? { resumoCidadao: o.resumoCidadao.trim(), significadoSim: o.significadoSim.trim(), significadoNao: o.significadoNao.trim() }
      : null;
  } catch {
    return null;
  }
}
