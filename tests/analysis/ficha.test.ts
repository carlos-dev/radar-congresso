import { describe, it, expect } from "vitest";
import { montarFicha } from "../../src/analysis/ficha";

describe("montarFicha", () => {
  it("nivelGeral é 'alerta' se houver ao menos um red flag em alerta", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 60, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("alerta");
    expect(ficha.redFlags).toHaveLength(4);
  });

  it("nivelGeral é 'sem_dado' quando NENHUM sinal tem dado", () => {
    // Sem base nenhuma, não dizemos que está "tudo certo" — dizemos que faltam dados.
    const ficha = montarFicha({
      presenca: { totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 0, mediaProposicoesPares: 20 },
    });
    expect(ficha.redFlags.map((r) => r.nivel)).toEqual(["sem_dado", "sem_dado", "sem_dado", "sem_dado"]);
    expect(ficha.nivelGeral).toBe("sem_dado");
  });

  it("ignora sinais sem_dado ao calcular o geral (usa só os que têm dado)", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 }, // sem_dado
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] }, // sem_dado
      emendas: { total: 0, porBeneficiario: [] }, // sem_dado
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 }, // ok
    });
    expect(ficha.nivelGeral).toBe("ok");
  });

  it("nivelGeral é 'ok' quando tudo ok/sem_dado", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 95, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("ok");
  });
});
