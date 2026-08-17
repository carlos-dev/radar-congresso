import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { InvestigacaoSecao } from "@/components/InvestigacaoSecao";

describe("InvestigacaoSecao", () => {
  it("mostra a conexão, o grau de confiança e o aviso de natureza probabilística", () => {
    const html = renderToStaticMarkup(
      <InvestigacaoSecao
        conexoes={[
          {
            tipo: "SOCIO", doadorNome: "João da Silva", doadorDoc: "***.456.789-**",
            empresaCnpj: "12.345.678/0001-90", empresaNome: "Construtora XPTO",
            valorDoacao: 5000, valorEmenda: 900000, ano: 2024, confianca: "alta",
          },
        ]}
      />,
    );
    expect(html).toContain("Construtora XPTO");
    expect(html).toContain("possível vínculo");
    expect(html).toContain("confira");
    expect(html).toContain("Confiança");
  });

  it("estado vazio quando não há conexões", () => {
    const html = renderToStaticMarkup(<InvestigacaoSecao conexoes={[]} />);
    expect(html).toContain("Nenhuma conexão");
  });
});
