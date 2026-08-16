import { describe, it, expect } from "vitest";
import { redFlagPresenca } from "../../src/analysis/presenca";

describe("redFlagPresenca", () => {
  it("alerta quando falta muito acima da média", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 60, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("4 de cada 10");
  });

  it("ok quando presença está boa", () => {
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 95, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há votações", () => {
    const rf = redFlagPresenca({ totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("sem_dado");
  });
});
