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

  it("atencao quando presença fica na faixa intermediária", () => {
    // taxa 0.83: < media-0.05 (0.85) mas NÃO < media-0.15 (0.75) → atencao
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 83, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("atencao");
  });

  it("ok abaixo da média usa frase 'dentro do normal'", () => {
    // taxa 0.88: não alcança atencao (>= 0.85) mas fica abaixo da média (0.9)
    const rf = redFlagPresenca({ totalVotacoes: 100, presencas: 88, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("ok");
    expect(rf.fraseSimples).toContain("dentro do normal");
  });

  it("sem_dado quando não há votações", () => {
    const rf = redFlagPresenca({ totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 });
    expect(rf.nivel).toBe("sem_dado");
  });
});
