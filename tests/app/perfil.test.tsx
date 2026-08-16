import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children?: unknown } & Record<string, unknown>) => (
    <a {...(props as Record<string, unknown>)}>{children as never}</a>
  ),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));
vi.mock("lucide-react", () => ({
  ArrowLeft: () => <svg data-icon="arrow-left" />,
  Info: () => <svg data-icon="info" />,
}));

vi.mock("@/lib/dados", () => ({
  obterPerfil: vi.fn().mockResolvedValue({
    id: "1",
    nome: "Fulano de Tal",
    partido: "XPTO",
    uf: "SP",
    casa: "CAMARA",
    urlFoto: "/f.jpg",
    ficha: {
      nivelGeral: "alerta",
      redFlags: [
        {
          id: "presenca",
          titulo: "Presença nas votações",
          nivel: "alerta",
          fraseSimples: "Faltou em muitas votações.",
          fonte: "Câmara/Senado — Dados Abertos",
        },
      ],
    },
  }),
}));

import Perfil from "@/app/parlamentar/[id]/page";

describe("Perfil", () => {
  it("mostra o parlamentar, o red flag com a fonte e o aviso ético", async () => {
    const el = await Perfil({ params: Promise.resolve({ id: "1" }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Fulano de Tal");
    expect(html).toContain("Presença nas votações");
    expect(html).toContain("Fonte:");
    // enquadramento ético (não são acusações + presunção de inocência)
    expect(html).toContain("não são acusações");
    expect(html).toContain("inocente até que a Justiça");
  });
});
