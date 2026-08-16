export function normalizaNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function soDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}
