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

  it("alerta somente pelo total acima da média, mesmo com baixa concentração", () => {
    // concentracao 5000/20000 = 0.25 (< 0.5); total 20000 > media*1.2 (12000) → alerta
    const rf = redFlagDespesas({
      totalGasto: 20000,
      mediaGastoPares: 10000,
      porFornecedor: [
        { nome: "A", valor: 5000 },
        { nome: "B", valor: 5000 },
        { nome: "C", valor: 5000 },
        { nome: "D", valor: 5000 },
      ],
    });
    expect(rf.nivel).toBe("alerta");
    // com baixa concentração o total lidera a frase, sem citar fornecedor
    expect(rf.fraseSimples).toContain("total ficou acima da média");
  });

  it("sem_dado quando não há gasto", () => {
    const rf = redFlagDespesas({ totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
