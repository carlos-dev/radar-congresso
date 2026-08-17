import { describe, it, expect } from "vitest";
import { redFlagLegislativa } from "../../src/analysis/legislativa";

describe("redFlagLegislativa", () => {
  it("atenção quando produz menos que a maioria", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 1, percentilRuim: 0.85 });
    expect(rf.nivel).toBe("atencao");
    expect(rf.fraseSimples).toContain("85%");
  });

  it("ok quando produz em linha com os colegas", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 25, percentilRuim: 0.3 });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há proposições", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 0, percentilRuim: 0 });
    expect(rf.nivel).toBe("sem_dado");
  });
});
