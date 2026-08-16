import { describe, it, expect } from "vitest";
import { montarFicha } from "../../src/analysis/ficha";

describe("montarFicha", () => {
  it("nivelGeral é 'alerta' se houver ao menos um red flag em alerta", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 60, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porMunicipio: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("alerta");
    expect(ficha.redFlags).toHaveLength(4);
  });

  it("nivelGeral é 'ok' quando tudo ok/sem_dado", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 95, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porMunicipio: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("ok");
  });
});
