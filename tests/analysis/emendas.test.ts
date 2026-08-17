import { describe, it, expect } from "vitest";
import { redFlagEmendas } from "../../src/analysis/emendas";

describe("redFlagEmendas", () => {
  it("alerta quando as emendas concentram em um beneficiário", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porBeneficiario: [{ nome: "Construtora XPTO", valor: 900000 }, { nome: "Outra", valor: 100000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("Construtora XPTO");
    expect(rf.fraseSimples).toContain("90%");
  });

  it("ok quando distribuído entre vários beneficiários", () => {
    const rf = redFlagEmendas({
      total: 900000,
      porBeneficiario: [
        { nome: "A", valor: 300000 }, { nome: "B", valor: 300000 }, { nome: "C", valor: 300000 },
      ],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há beneficiários rastreáveis", () => {
    const rf = redFlagEmendas({ total: 0, porBeneficiario: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
