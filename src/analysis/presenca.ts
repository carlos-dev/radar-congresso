import type { RedFlag } from "./types";

export interface PresencaInput {
  totalVotacoes: number;
  presencas: number;
  mediaPresencaPares: number; // 0..1
}

function nivelPresenca(taxa: number, media: number): RedFlag["nivel"] {
  if (taxa < media - 0.15) return "alerta";
  if (taxa < media - 0.05) return "atencao";
  return "ok";
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
  const nivel = nivelPresenca(taxa, i.mediaPresencaPares);
  const faltasEmDez = Math.round((1 - taxa) * 10);
  const frase = `Faltou em ${faltasEmDez} de cada 10 votações.`;

  let comparacao: string;
  if (nivel !== "ok") {
    comparacao = " Isso é mais faltas que a maioria dos colegas.";
  } else if (taxa >= i.mediaPresencaPares) {
    comparacao = " Está entre os que mais comparecem.";
  } else {
    comparacao = " Presença dentro do normal.";
  }

  return { ...base, nivel, fraseSimples: frase + comparacao };
}
