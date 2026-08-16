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

vi.mock("@/lib/dados", () => ({
  listarParlamentares: vi.fn().mockResolvedValue([
    { id: "1", nome: "Fulano de Tal", partido: "XPTO", uf: "SP", casa: "CAMARA", urlFoto: "/f.jpg" },
  ]),
}));

import Page from "@/app/page";

describe("Home", () => {
  it("renderiza a lista de parlamentares", async () => {
    const el = await Page({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("Fulano de Tal");
    expect(html).toContain("XPTO");
    expect(html).toContain("Buscar");
  });
});
