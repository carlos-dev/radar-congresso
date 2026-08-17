import { describe, it, expect } from "vitest";
import { scoreImportancia } from "../../src/analysis/importancia";

describe("scoreImportancia", () => {
  it("PEC disputada e cheia pontua mais que PL folgado", () => {
    const pec = scoreImportancia({ tipo: "PEC", votosSim: 250, votosNao: 230, votosOutros: 0 });
    const pl = scoreImportancia({ tipo: "PL", votosSim: 400, votosNao: 20, votosOutros: 0 });
    expect(pec).toBeGreaterThan(pl);
  });

  it("placar apertado pontua mais que goleada, mesmo tipo", () => {
    const apertado = scoreImportancia({ tipo: "PEC", votosSim: 250, votosNao: 240, votosOutros: 0 });
    const goleada = scoreImportancia({ tipo: "PEC", votosSim: 480, votosNao: 10, votosOutros: 0 });
    expect(apertado).toBeGreaterThan(goleada);
  });

  it("votação sem tipo (procedural) pontua baixo", () => {
    const proc = scoreImportancia({ tipo: null, votosSim: 250, votosNao: 240, votosOutros: 0 });
    const pec = scoreImportancia({ tipo: "PEC", votosSim: 250, votosNao: 240, votosOutros: 0 });
    expect(proc).toBeLessThan(pec);
  });

  it("sem votos → score 0", () => {
    expect(scoreImportancia({ tipo: "PEC", votosSim: 0, votosNao: 0, votosOutros: 0 })).toBe(0);
    expect(scoreImportancia({ tipo: "PEC", votosSim: null, votosNao: null, votosOutros: null })).toBe(0);
  });
});
