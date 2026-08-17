import type { RedFlag } from "./types";
import { pctInt } from "./percentil";

export interface LegislativaInput {
  totalProposicoes: number;
  /** Fração de colegas que produziram MAIS (0..1). Maior = pior. */
  percentilRuim: number;
}

export function redFlagLegislativa(i: LegislativaInput): RedFlag {
  const base = {
    id: "legislativa",
    titulo: "Produção legislativa",
    fonte: "Câmara — Proposições de autoria",
  };
  if (i.totalProposicoes === 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem dados de projetos de autoria no período." };
  }
  // Produção baixa vira no máximo "atenção" (não é "alerta" de gravidade).
  const nivel: RedFlag["nivel"] = i.percentilRuim >= 0.75 ? "atencao" : "ok";
  const frase =
    nivel === "ok"
      ? `Apresentou ${i.totalProposicoes} projetos — em linha com os colegas.`
      : `Apresentou ${i.totalProposicoes} projetos — menos que ${pctInt(i.percentilRuim)}% dos colegas.`;
  return { ...base, nivel, fraseSimples: frase };
}
