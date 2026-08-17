import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children?: unknown; href?: string }) => (
    <a href={href as string}>{children as never}</a>
  ),
}));

import { RedFlagCard } from "@/components/RedFlagCard";

describe("RedFlagCard ver detalhes", () => {
  it("mostra link de detalhe para o tema certo (despesas → cota)", () => {
    const html = renderToStaticMarkup(
      <RedFlagCard
        numero={2}
        idParlamentar="p1"
        rf={{ id: "despesas", titulo: "Uso da cota", nivel: "alerta", fraseSimples: "x", fonte: "y" }}
      />,
    );
    expect(html).toContain("/parlamentar/p1/cota");
    expect(html).toContain("Ver detalhes");
  });

  it("não mostra link quando sem_dado", () => {
    const html = renderToStaticMarkup(
      <RedFlagCard
        numero={1}
        idParlamentar="p1"
        rf={{ id: "emendas", titulo: "Emendas", nivel: "sem_dado", fraseSimples: "x", fonte: "y" }}
      />,
    );
    expect(html).not.toContain("Ver detalhes");
  });
});
