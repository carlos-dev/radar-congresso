import { describe, it, expect } from "vitest";
import { redFlagDespesas } from "../../src/analysis/despesas";

describe("redFlagDespesas", () => {
  it("alerta quando um fornecedor concentra a maior parte do gasto", () => {
    const rf = redFlagDespesas({
      totalGasto: 10000,
      mediaGastoPares: 9000,
      porFornecedor: [{ nome: "X", valor: 8000 }, { nome: "Y", valor: 2000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("80%");
  });

  it("ok quando gasto distribuído e dentro da média", () => {
    const rf = redFlagDespesas({
      totalGasto: 5000,
      mediaGastoPares: 9000,
      porFornecedor: [{ nome: "X", valor: 2500 }, { nome: "Y", valor: 2500 }],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há gasto", () => {
    const rf = redFlagDespesas({ totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
