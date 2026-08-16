import type { RedFlag } from "./types";

export interface DespesasInput {
  totalGasto: number;
  mediaGastoPares: number;
  porFornecedor: Array<{ nome: string; valor: number }>;
}

export function redFlagDespesas(i: DespesasInput): RedFlag {
  const base = {
    id: "despesas",
    titulo: "Uso da cota parlamentar",
    fonte: "Câmara — Cota para Exercício da Atividade Parlamentar (CEAP)",
  };
  if (i.totalGasto <= 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem gastos de cota registrados no período." };
  }
  const maior = i.porFornecedor.reduce((m, f) => (f.valor > m.valor ? f : m), { nome: "", valor: 0 });
  const concentracao = maior.valor / i.totalGasto;
  const pct = Math.round(concentracao * 100);
  const acimaMedia = i.totalGasto > i.mediaGastoPares * 1.2;
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7 || acimaMedia) nivel = "alerta";
  else if (concentracao > 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Gastos distribuídos e dentro da média dos colegas."
      : `${pct}% do gasto foi para um único fornecedor (${maior.nome}).` +
        (acimaMedia ? " O total também está acima da média." : "");
  return { ...base, nivel, fraseSimples: frase };
}
