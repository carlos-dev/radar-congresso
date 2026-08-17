import type { Nivel, RedFlag } from "./types";
import { nivelPorPercentil, pctInt } from "./percentil";

export interface DespesasInput {
  totalGasto: number;
  /** Fração de colegas que gastaram MENOS (0..1). Maior = pior. */
  percentilRuim: number;
  porFornecedor: Array<{ nome: string; valor: number }>;
}

const ORDEM: Nivel[] = ["sem_dado", "ok", "atencao", "alerta"];
const pior = (a: Nivel, b: Nivel): Nivel => (ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b);

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
  const nivelGasto = nivelPorPercentil(i.percentilRuim);
  const nivelConc: Nivel = concentracao >= 0.7 ? "alerta" : concentracao > 0.5 ? "atencao" : "ok";
  const nivel = pior(nivelGasto, nivelConc);

  let frase: string;
  if (nivel === "ok") {
    frase = "Gastos dentro do normal e distribuídos.";
  } else if (ORDEM.indexOf(nivelGasto) >= ORDEM.indexOf(nivelConc)) {
    frase = `Gastou mais que ${pctInt(i.percentilRuim)}% dos colegas.`;
    if (concentracao > 0.5) frase += ` E concentrou ${Math.round(concentracao * 100)}% em um fornecedor.`;
  } else {
    frase = `${Math.round(concentracao * 100)}% do gasto foi para um único fornecedor (${maior.nome}).`;
  }
  return { ...base, nivel, fraseSimples: frase };
}
