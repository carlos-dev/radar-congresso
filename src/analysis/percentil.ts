import type { Nivel } from "./types";

/**
 * `percentilRuim` = fração de colegas em posição MELHOR que a do parlamentar no
 * sentido do sinal (0..1). Quanto maior, pior a posição relativa dele.
 * Ex.: 0.9 = pior que 90% dos colegas → alerta.
 */
export function nivelPorPercentil(percentilRuim: number): Nivel {
  if (percentilRuim >= 0.9) return "alerta";
  if (percentilRuim >= 0.75) return "atencao";
  return "ok";
}

/** Percentil (0..1) → inteiro 0..100 para exibição. */
export function pctInt(p: number): number {
  return Math.round(p * 100);
}
