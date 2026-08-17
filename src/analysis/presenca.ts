import type { RedFlag } from "./types";
import { nivelPorPercentil, pctInt } from "./percentil";

export interface PresencaInput {
  totalVotacoes: number;
  presencas: number;
  /** Fração de colegas que faltaram MENOS (0..1). Maior = pior. */
  percentilRuim: number;
}

export function redFlagPresenca(i: PresencaInput): RedFlag {
  const base = {
    id: "presenca",
    titulo: "Presença nas votações",
    fonte: "Câmara/Senado — Dados Abertos",
  };
  if (i.totalVotacoes === 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Ainda não há votações registradas no período." };
  }
  const taxa = i.presencas / i.totalVotacoes;
  const faltasEmDez = Math.round((1 - taxa) * 10);
  const nivel = nivelPorPercentil(i.percentilRuim);
  const frase =
    nivel === "ok"
      ? `Faltou em ${faltasEmDez} de cada 10 votações — presença dentro do normal.`
      : `Faltou em ${faltasEmDez} de cada 10 votações — mais que ${pctInt(i.percentilRuim)}% dos colegas.`;
  return { ...base, nivel, fraseSimples: frase };
}
