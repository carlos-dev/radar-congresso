import type { RedFlag } from "./types";

export interface EmendasInput {
  total: number;
  porBeneficiario: Array<{ nome: string; valor: number }>;
}

export function redFlagEmendas(i: EmendasInput): RedFlag {
  const base = {
    id: "emendas",
    titulo: "Destino das emendas",
    fonte: "Portal da Transparência — Emendas e execução",
  };
  if (i.total <= 0 || i.porBeneficiario.length === 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem beneficiários rastreáveis no período." };
  }
  const maior = i.porBeneficiario.reduce((m, x) => (x.valor > m.valor ? x : m), { nome: "", valor: 0 });
  const concentracao = maior.valor / i.total;
  const pct = Math.round(concentracao * 100);
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7) nivel = "alerta";
  else if (concentracao >= 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Emendas distribuídas entre vários beneficiários."
      : `${pct}% das emendas foram para um só beneficiário (${maior.nome}). Vale entender o porquê.`;
  return { ...base, nivel, fraseSimples: frase };
}
