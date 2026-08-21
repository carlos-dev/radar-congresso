import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ children, ...p }: { children?: unknown } & Record<string, unknown>) => (
    <a {...(p as Record<string, unknown>)}>{children as never}</a>
  ),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));
vi.mock("@/data/parlamentares", () => ({
  obterPerfil: vi.fn().mockResolvedValue({
    id: "1", externalId: "1", nome: "Fulano", partido: "X", uf: "SP", casa: "CAMARA", urlFoto: null,
    ficha: { nivelGeral: "ok", redFlags: [] },
  }),
}));
vi.mock("@/data/detalhe", () => ({
  detalheCota: vi.fn().mockResolvedValue({
    ano: 2025,
    total: 500,
    numFornecedores: 1,
    porMes: Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, total: i === 0 ? 500 : 0 })),
    fornecedores: [{ nome: "Forn A", doc: "1", total: 500, qtd: 2 }],
  }),
  listaProjetos: vi.fn(),
  listaVotacoes: vi.fn(),
  listaEmendas: vi.fn(),
}));

import Detalhe from "@/app/parlamentar/[id]/[tema]/page";

describe("Página de detalhe", () => {
  it("cota: mostra o fornecedor e o total", async () => {
    const el = await Detalhe({
      params: Promise.resolve({ id: "1", tema: "cota" }),
      searchParams: Promise.resolve({}),
    });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Forn A");
    expect(html).toContain("Fulano");
  });

  it("tema inválido → notFound", async () => {
    await expect(
      Detalhe({ params: Promise.resolve({ id: "1", tema: "xyz" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("notFound");
  });

  it("usa o id interno (cuid) do perfil nas queries, não o slug da URL", async () => {
    const { detalheCota } = await import("@/data/detalhe");
    vi.mocked(detalheCota).mockClear();
    // a URL traz o slug; a query de dados tem que usar o perfil.id ("1"), não o slug
    await Detalhe({ params: Promise.resolve({ id: "fulano-de-tal-1", tema: "cota" }), searchParams: Promise.resolve({}) });
    expect(vi.mocked(detalheCota)).toHaveBeenCalledWith("1", expect.any(Number));
  });
});
