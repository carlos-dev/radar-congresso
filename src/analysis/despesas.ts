import type { RedFlag } from "./types";

export interface DespesasInput {
  totalGasto: number;
  mediaGastoPares: number;
  porFornecedor: Array<{ nome: string; valor: number }>;
}

// NOTA: limiar de concentração aqui é > 0.5 (atenção), diferente de emendas.ts
// que usa >= 0.5. A diferença é intencional — não unificar sem revisar ambos.
function nivelDespesas(concentracao: number, acimaMedia: boolean): RedFlag["nivel"] {
  if (concentracao >= 0.7 || acimaMedia) return "alerta";
  if (concentracao > 0.5) return "atencao";
  return "ok";
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
  const nivel = nivelDespesas(concentracao, acimaMedia);

  let frase: string;
  if (nivel === "ok") {
    frase = "Gastos distribuídos e dentro da média dos colegas.";
  } else if (acimaMedia && concentracao < 0.5) {
    // Quando o gatilho é o total (não a concentração), lidera com o total.
    frase = "O gasto total ficou acima da média dos colegas.";
  } else {
    frase =
      `${pct}% do gasto foi para um único fornecedor (${maior.nome}).` +
      (acimaMedia ? " O total também está acima da média." : "");
  }

  return { ...base, nivel, fraseSimples: frase };
}
