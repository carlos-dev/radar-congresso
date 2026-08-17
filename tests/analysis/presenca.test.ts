import { describe, it, expect } from "vitest";
import { redFlagPresenca } from "../../src/analysis/presenca";

describe("redFlagPresenca", () => {
  it("alerta quando falta mais que a maioria (percentil ruim alto)", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 60, percentilRuim: 0.95 });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("95%");
    expect(rf.fraseSimples).toContain("4 de cada 10");
  });

  it("ok quando presença dentro do normal", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 95, percentilRuim: 0.3 });
    expect(rf.nivel).toBe("ok");
    expect(rf.fraseSimples).toContain("dentro do normal");
  });

  it("sem_dado quando não há votações", () => {
    const rf = redFlagPresenca({ totalVotacoes: 0, presencas: 0, percentilRuim: 0 });
    expect(rf.nivel).toBe("sem_dado");
  });
});
