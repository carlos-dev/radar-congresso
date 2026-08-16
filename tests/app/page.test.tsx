import { describe, it, expect, vi } from "vitest";

// next/link is a CJS module with a circular structure that breaks JSON.stringify;
// mock it as a plain anchor so the rendered element can be serialized in tests.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: unknown; href: string }) => ({
    type: "a",
    props: { href, children },
  }),
}));

vi.mock("../../src/data/parlamentares", () => ({
  listarParlamentares: vi.fn().mockResolvedValue([
    { id: "1", nome: "Fulano", partido: "XPTO", uf: "SP", casa: "CAMARA", urlFoto: null },
  ]),
}));

import Page from "../../src/app/page";

describe("Home", () => {
  it("renderiza a lista de parlamentares", async () => {
    const el = await Page({ searchParams: Promise.resolve({}) });
    const json = JSON.stringify(el);
    expect(json).toContain("Fulano");
  });
});
