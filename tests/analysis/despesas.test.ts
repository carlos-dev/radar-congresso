import { describe, it, expect } from "vitest";
import { redFlagDespesas } from "../../src/analysis/despesas";

describe("redFlagDespesas", () => {
  it("alerta quando gasta mais que quase todos (percentil ruim alto)", () => {
    const rf = redFlagDespesas({
      totalGasto: 500000,
      percentilRuim: 0.95,
      porFornecedor: [{ nome: "X", valor: 100000 }, { nome: "Y", valor: 400000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("95%");
  });

  it("alerta por concentração num único fornecedor, mesmo com gasto normal", () => {
    const rf = redFlagDespesas({
      totalGasto: 10000,
      percentilRuim: 0.2,
      porFornecedor: [{ nome: "Gráfica XPTO", valor: 9000 }, { nome: "Y", valor: 1000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("Gráfica XPTO");
  });

  it("ok quando gasto normal e distribuído", () => {
    const rf = redFlagDespesas({
      totalGasto: 5000,
      percentilRuim: 0.4,
      porFornecedor: [{ nome: "A", valor: 2500 }, { nome: "B", valor: 2500 }],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há gasto", () => {
    const rf = redFlagDespesas({ totalGasto: 0, percentilRuim: 0, porFornecedor: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
