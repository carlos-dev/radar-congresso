import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MiniColunas, BarraLinha } from "@/components/detalhe";

describe("MiniColunas", () => {
  it("a barra do maior valor tem height:100% dentro de uma trilha de altura fixa", () => {
    const html = renderToStaticMarkup(
      <MiniColunas
        dados={[
          { rotulo: "jan", valor: 100 },
          { rotulo: "fev", valor: 50 },
          { rotulo: "mar", valor: 0 },
        ]}
        formata={(v) => String(v)}
      />,
    );
    // trilha de altura fixa (senão a % da barra colapsa pra zero)
    expect(html).toContain("h-32");
    // maior valor → barra cheia; segundo → metade
    expect(html).toContain("height:100%");
    expect(html).toContain("height:50%");
  });

  it("valor zero não gera altura", () => {
    const html = renderToStaticMarkup(
      <MiniColunas dados={[{ rotulo: "x", valor: 0 }]} formata={(v) => String(v)} />,
    );
    expect(html).toContain("height:0%");
  });
});

describe("BarraLinha", () => {
  it("largura da barra reflete a fração (mínimo 2%)", () => {
    const cheia = renderToStaticMarkup(
      <BarraLinha titulo="A" valor="R$ 100" fracao={1} />,
    );
    expect(cheia).toContain("width:100%");
    const minima = renderToStaticMarkup(
      <BarraLinha titulo="B" valor="R$ 1" fracao={0} />,
    );
    expect(minima).toContain("width:2%");
  });
});
