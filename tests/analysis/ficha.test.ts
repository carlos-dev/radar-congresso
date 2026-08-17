import { describe, it, expect } from "vitest";
import { montarFicha } from "../../src/analysis/ficha";

describe("montarFicha", () => {
  it("nivelGeral é 'alerta' se houver ao menos um red flag em alerta", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 60, percentilRuim: 0.95 },
      despesas: { totalGasto: 0, percentilRuim: 0, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 25, percentilRuim: 0.3 },
    });
    expect(ficha.nivelGeral).toBe("alerta");
    expect(ficha.redFlags).toHaveLength(4);
  });

  it("nivelGeral é 'sem_dado' quando NENHUM sinal tem dado", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 0, presencas: 0, percentilRuim: 0 },
      despesas: { totalGasto: 0, percentilRuim: 0, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 0, percentilRuim: 0 },
    });
    expect(ficha.redFlags.map((r) => r.nivel)).toEqual(["sem_dado", "sem_dado", "sem_dado", "sem_dado"]);
    expect(ficha.nivelGeral).toBe("sem_dado");
  });

  it("ignora sinais sem_dado ao calcular o geral (usa só os que têm dado)", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 0, presencas: 0, percentilRuim: 0 }, // sem_dado
      despesas: { totalGasto: 0, percentilRuim: 0, porFornecedor: [] }, // sem_dado
      emendas: { total: 0, porBeneficiario: [] }, // sem_dado
      legislativa: { totalProposicoes: 25, percentilRuim: 0.3 }, // ok
    });
    expect(ficha.nivelGeral).toBe("ok");
  });

  it("nivelGeral é 'ok' quando tudo ok/sem_dado", () => {
    const ficha = montarFicha({
      presenca: { totalVotacoes: 100, presencas: 95, percentilRuim: 0.2 },
      despesas: { totalGasto: 0, percentilRuim: 0, porFornecedor: [] },
      emendas: { total: 0, porBeneficiario: [] },
      legislativa: { totalProposicoes: 25, percentilRuim: 0.3 },
    });
    expect(ficha.nivelGeral).toBe("ok");
  });
});
