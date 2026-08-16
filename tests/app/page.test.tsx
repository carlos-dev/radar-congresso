import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mocks leves para módulos do Next/ícones, para renderizar em ambiente node.
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children?: unknown } & Record<string, unknown>) => (
    <a {...(props as Record<string, unknown>)}>{children as never}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("lucide-react", () => ({}));

vi.mock("@/lib/dados", () => ({
  listarComRadar: vi.fn().mockResolvedValue([
    {
      id: "1",
      nome: "Fulano de Tal",
      partido: "XPTO",
      uf: "SP",
      casa: "CAMARA",
      urlFoto: null,
      ficha: {
        nivelGeral: "alerta",
        redFlags: [
          { id: "presenca", titulo: "Presença nas votações", nivel: "alerta", fraseSimples: "Faltou muito.", fonte: "Câmara" },
          { id: "despesas", titulo: "Gastos da cota", nivel: "atencao", fraseSimples: "Gastou acima.", fonte: "Câmara" },
          { id: "emendas", titulo: "Emendas", nivel: "ok", fraseSimples: "Distribuídas.", fonte: "Transparência" },
          { id: "legislativa", titulo: "Produção legislativa", nivel: "ok", fraseSimples: "Apresentou projetos.", fonte: "Câmara" },
        ],
      },
    },
  ]),
}));

import Page from "@/app/page";

describe("Home", () => {
  it("renderiza a lista com o radar e o título principal", async () => {
    const el = await Page({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Fulano de Tal");
    expect(html).toContain("XPTO");
    expect(html).toContain("Seus deputados e senadores");
    expect(html).toContain("Buscar");
  });
});
