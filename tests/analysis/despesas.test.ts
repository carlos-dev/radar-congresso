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

  it("atenção (não alerta) ao concentrar em categoria discricionária", () => {
    const rf = redFlagDespesas({
      totalGasto: 100000,
      percentilRuim: 0.2,
      porFornecedor: [{ nome: "Agência XPTO", valor: 90000 }, { nome: "Y", valor: 10000 }],
      categoriaConcentrada: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.",
    });
    expect(rf.nivel).toBe("atencao");
    expect(rf.fraseSimples).toContain("Agência XPTO");
    expect(rf.fraseSimples).toContain("divulgação");
  });

  it("concentração em transporte/aluguel NÃO sinaliza (operacional)", () => {
    const rf = redFlagDespesas({
      totalGasto: 100000,
      percentilRuim: 0.2,
      porFornecedor: [{ nome: "Táxi Aéreo LTDA", valor: 90000 }, { nome: "Y", valor: 10000 }],
      categoriaConcentrada: "LOCAÇÃO OU FRETAMENTO DE AERONAVES",
    });
    expect(rf.nivel).toBe("ok");
  });

  it("concentração discricionária mas gasto baixo (abaixo do piso) não sinaliza", () => {
    const rf = redFlagDespesas({
      totalGasto: 10000,
      percentilRuim: 0.2,
      porFornecedor: [{ nome: "Agência", valor: 9000 }, { nome: "Y", valor: 1000 }],
      categoriaConcentrada: "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR.",
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há gasto", () => {
    const rf = redFlagDespesas({ totalGasto: 0, percentilRuim: 0, porFornecedor: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
