// Ano de referência para dados anuais (despesas, emendas).
// Usa o ano anterior ao atual, pois o ano corrente costuma estar incompleto
// nas bases oficiais. Ajuste conforme a disponibilidade dos dados.
export const ANO_REFERENCIA = new Date().getFullYear() - 1;
