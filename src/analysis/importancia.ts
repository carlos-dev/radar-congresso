export interface VotacaoScoreInput {
  tipo: string | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
}

// Peso por tipo de matéria: PEC muda a Constituição, requerimento é procedural.
const PESO_TIPO: Record<string, number> = {
  PEC: 1,
  PLP: 0.8,
  MPV: 0.7,
  PL: 0.5,
  PDL: 0.3,
  PRC: 0.3,
};
const PESO_SEM_TIPO = 0.1;
const PARTICIPACAO_REF = 460; // referência de quórum cheio na Câmara

/**
 * Score de relevância (0..1) de uma votação, a partir de sinais VERIFICÁVEIS:
 * peso do tipo × quão disputado foi o placar × participação. Não é "importância"
 * absoluta — é um proxy transparente para ordenar candidatas ao destaque.
 */
export function scoreImportancia(v: VotacaoScoreInput): number {
  const sim = v.votosSim ?? 0;
  const nao = v.votosNao ?? 0;
  const total = sim + nao + (v.votosOutros ?? 0);
  if (total === 0) return 0;
  const peso = v.tipo ? (PESO_TIPO[v.tipo] ?? PESO_SEM_TIPO) : PESO_SEM_TIPO;
  const disputa = sim + nao > 0 ? 1 - Math.abs(sim - nao) / (sim + nao) : 0; // 0..1
  const participacao = Math.min(1, total / PARTICIPACAO_REF); // 0..1
  return peso * (0.5 + 0.5 * disputa) * participacao;
}
