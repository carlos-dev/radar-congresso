import { describe, it, expect } from "vitest";
import { obterRankings } from "../../src/data/rankings";

describe("obterRankings", () => {
  it("retorna rankings com itens ordenados desc e posições sequenciais", async () => {
    const rankings = await obterRankings();
    expect(Array.isArray(rankings)).toBe(true);
    for (const r of rankings) {
      expect(r.itens.length).toBeGreaterThan(0);
      expect(r.itens.length).toBeLessThanOrEqual(10);
      // posições 1..n
      expect(r.itens.map((i) => i.posicao)).toEqual(r.itens.map((_, i) => i + 1));
      // valores em ordem decrescente
      for (let i = 1; i < r.itens.length; i++) {
        expect(r.itens[i - 1].valor).toBeGreaterThanOrEqual(r.itens[i].valor);
      }
      // todo item tem nome e valor positivo
      for (const item of r.itens) {
        expect(item.nome.length).toBeGreaterThan(0);
        expect(item.valor).toBeGreaterThan(0);
      }
    }
  });
});
