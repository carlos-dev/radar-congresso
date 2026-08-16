import type { RedFlag } from "./types";

export interface LegislativaInput {
  totalProposicoes: number;
  mediaProposicoesPares: number;
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
  const nivel: RedFlag["nivel"] =
    i.totalProposicoes < i.mediaProposicoesPares * 0.25 ? "atencao" : "ok";
  const frase =
    nivel === "ok"
      ? `Apresentou ${i.totalProposicoes} projetos — em linha com os colegas.`
      : `Apresentou só ${i.totalProposicoes} projetos, bem menos que a média dos colegas.`;
  return { ...base, nivel, fraseSimples: frase };
}
