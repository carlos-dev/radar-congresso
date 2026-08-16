import type { RedFlag } from "./types";

export interface PresencaInput {
  totalVotacoes: number;
  presencas: number;
  mediaPresencaPares: number; // 0..1
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
  const frase = `Faltou em ${faltasEmDez} de cada 10 votações.`;
  let nivel: RedFlag["nivel"] = "ok";
  if (taxa < i.mediaPresencaPares - 0.15) nivel = "alerta";
  else if (taxa < i.mediaPresencaPares - 0.05) nivel = "atencao";
  const comparacao =
    nivel === "ok" ? " Está entre os que mais comparecem." : " Isso é mais faltas que a maioria dos colegas.";
  return { ...base, nivel, fraseSimples: frase + comparacao };
}
