import { describe, it, expect } from "vitest";
import { redFlagLegislativa } from "../../src/analysis/legislativa";

describe("redFlagLegislativa", () => {
  it("atenção quando produz bem abaixo da média", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 1, mediaProposicoesPares: 20 });
    expect(rf.nivel).toBe("atencao");
    expect(rf.fraseSimples).toContain("1");
  });

  it("ok quando produz na média ou acima", () => {
    const rf = redFlagLegislativa({ totalProposicoes: 25, mediaProposicoesPares: 20 });
    expect(rf.nivel).toBe("ok");
  });
});
