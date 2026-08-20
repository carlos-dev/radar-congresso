// slug legível + id oficial (externalId) como sufixo estável.
export function slugParlamentar(nome: string, externalId: string): string {
  const base = nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base}-${externalId}`;
}

// Extrai o externalId do fim do slug (o que vem depois do último "-", só dígitos).
export function externalIdDoSlug(slug: string): string | null {
  const m = slug.match(/-(\d+)$/);
  return m ? m[1] : null;
}
