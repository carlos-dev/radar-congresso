import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({ default: ({ children, href }: { children?: unknown; href?: string }) => (<a href={href as string}>{children as never}</a>) }));
vi.mock("@/components/TopNav", () => ({ TopNav: () => <nav /> }));
vi.mock("@/components/SiteFooter", () => ({ SiteFooter: () => <footer /> }));
vi.mock("@/data/pautas", () => ({
  pautasQueImportam: vi.fn().mockResolvedValue([
    { id: "v1", casa: "CAMARA", data: new Date("2025-01-01"), titulo: "Reforma Tributária", resumoCidadao: "Muda os impostos.", significadoSim: "A favor da reforma.", significadoNao: "Contra a reforma.", secreta: false, revisada: true },
    { id: "v2", casa: "SENADO", data: new Date("2025-02-01"), titulo: "Sabatina X", resumoCidadao: null, significadoSim: null, significadoNao: null, secreta: true, revisada: false },
  ]),
  votosPorUf: vi.fn().mockResolvedValue({
    v1: { SIM: [{ id: "p1", nome: "Fulano", partido: "PT", uf: "PE", casa: "CAMARA" }], NAO: [{ id: "p2", nome: "Ciclano", partido: "PL", uf: "PE", casa: "CAMARA" }] },
    v2: {},
  }),
}));

import Pagina from "@/app/como-votaram/page";

describe("como-votaram", () => {
  it("sem uf, mostra o seletor de estados", async () => {
    const el = await Pagina({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("?uf=PE");
    expect(html).toContain("?uf=SP");
  });
  it("com uf, mostra pautas, significados e votos com link pro perfil", async () => {
    const el = await Pagina({ searchParams: Promise.resolve({ uf: "PE" }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Reforma Tributária");
    expect(html).toContain("Muda os impostos.");
    expect(html).toContain("A favor da reforma.");
    expect(html).toContain("Fulano");
    expect(html).toContain("/parlamentar/p1");
    expect(html).toContain("sigiloso"); // v2 secreta
  });
});
