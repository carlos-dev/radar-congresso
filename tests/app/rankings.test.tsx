import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: unknown; href?: string }) => (
    <a href={href as string}>{children as never}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (p: Record<string, unknown>) => <img {...(p as Record<string, unknown>)} />,
}));
vi.mock("@/data/rankings", () => ({
  obterRankings: vi.fn().mockResolvedValue([
    {
      chave: "gasto",
      titulo: "Quem mais gastou a cota parlamentar",
      subtitulo: "sub",
      unidade: "brl",
      fonte: "Câmara — CEAP",
      itens: [
        { posicao: 1, id: "a", nome: "Fulano Silva", partido: "PT", uf: "SP", casa: "CAMARA", urlFoto: null, valor: 500000 },
        { posicao: 2, id: "b", nome: "Beltrano Souza", partido: "PL", uf: "BA", casa: "CAMARA", urlFoto: null, valor: 250000 },
      ],
    },
  ]),
}));

import Rankings from "@/app/rankings/page";

describe("Página de rankings", () => {
  it("mostra o título do ranking, o líder e o valor formatado", async () => {
    const el = await Rankings();
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Quem mais gastou a cota parlamentar");
    expect(html).toContain("Fulano Silva");
    expect(html).toContain("R$"); // valor em BRL
    expect(html).toContain("/parlamentar/a"); // link para o perfil do líder
  });
});
