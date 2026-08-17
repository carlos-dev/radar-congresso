import { describe, it, expect } from "vitest";
import { votacoesEmDestaque, comoVotou, limpaDescricao } from "../../src/data/votacoes";

describe("limpaDescricao", () => {
  it("remove o sufixo de placar e encurta", () => {
    const s = limpaDescricao("Aprovada a matéria. Sim: 300; Não: 100; Total: 400.");
    expect(s).not.toContain("Sim:");
    expect(s).toContain("Aprovada a matéria");
  });
});

describe("votacoesEmDestaque", () => {
  it("traz votações curadas primeiro, com título e placar", async () => {
    const vs = await votacoesEmDestaque(10);
    expect(vs.length).toBeGreaterThan(0);
    // toda votação tem título não vazio (curado ou descrição limpa)
    for (const v of vs) expect(v.titulo.length).toBeGreaterThan(0);
    // as curadas (destaque manual) vêm antes das não-curadas
    const primeiraNaoCurada = vs.findIndex((v) => !v.curada);
    if (primeiraNaoCurada >= 0) {
      for (let i = primeiraNaoCurada; i < vs.length; i++) expect(vs[i].curada).toBe(false);
    }
    // a Reforma Tributária (curada) deve aparecer
    expect(vs.some((v) => /reforma tributária/i.test(v.titulo))).toBe(true);
  });
});

describe("comoVotou", () => {
  it("cobre todos os ids pedidos, ausente quando não há registro", async () => {
    const vs = await votacoesEmDestaque(5);
    const ids = vs.map((v) => v.id);
    const mapa = await comoVotou("id-inexistente", ids);
    expect(mapa.size).toBe(ids.length);
    for (const id of ids) expect(mapa.get(id)).toBe("AUSENTE");
  });
});
