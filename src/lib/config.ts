// Ano de referência para dados anuais (despesas, emendas).
// Usa o ano anterior ao atual, pois o ano corrente costuma estar incompleto
// nas bases oficiais. Ajuste conforme a disponibilidade dos dados.
export const ANO_REFERENCIA = new Date().getFullYear() - 1;

// Início da legislatura atual (57ª, 2023–2026). Usado para escopar a produção
// legislativa ao mandato corrente — comparação justa entre parlamentares.
export const ANO_MANDATO_INICIO = 2023;

/** Anos do mandato atual até hoje (ex.: [2023, 2024, 2025, 2026]). */
export function anosMandato(): number[] {
  const fim = new Date().getFullYear();
  const anos: number[] = [];
  for (let a = ANO_MANDATO_INICIO; a <= fim; a++) anos.push(a);
  return anos;
}
