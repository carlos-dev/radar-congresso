import type { RedFlag } from "./types";

export interface EmendasInput {
  total: number;
  porMunicipio: Array<{ municipio: string; valor: number }>;
}

export function redFlagEmendas(i: EmendasInput): RedFlag {
  const base = {
    id: "emendas",
    titulo: "Destino das emendas",
    fonte: "Portal da Transparência — Emendas Parlamentares",
  };
  if (i.total <= 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem emendas registradas no período." };
  }
  const maior = i.porMunicipio.reduce(
    (m, x) => (x.valor > m.valor ? x : m),
    { municipio: "", valor: 0 },
  );
  const concentracao = maior.valor / i.total;
  const pct = Math.round(concentracao * 100);
  let nivel: RedFlag["nivel"] = "ok";
  if (concentracao >= 0.7) nivel = "alerta";
  else if (concentracao >= 0.5) nivel = "atencao";
  const frase =
    nivel === "ok"
      ? "Emendas espalhadas por vários municípios."
      : `${pct}% das emendas foram para um só município (${maior.municipio}). Vale entender o porquê.`;
  return { ...base, nivel, fraseSimples: frase };
}
