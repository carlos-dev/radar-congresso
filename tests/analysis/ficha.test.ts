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

  it("remapeia sem_dado geral para 'ok' (presença/despesas/emendas sem dado, legislativa ok)", () => {
    // NOTA: redFlagLegislativa nunca retorna "sem_dado" (não há esse nível para produção),
    // então não é possível ter os 4 red flags em sem_dado via montarFicha. Este caso
    // exercita o remap indiretamente: os três que suportam sem_dado ficam sem dado e a
    // legislativa fica ok, resultando em nivelGeral "ok".
    const ficha = montarFicha({
      presenca: { totalVotacoes: 0, presencas: 0, mediaPresencaPares: 0.9 },
      despesas: { totalGasto: 0, mediaGastoPares: 9000, porFornecedor: [] },
      emendas: { total: 0, porMunicipio: [] },
      legislativa: { totalProposicoes: 25, mediaProposicoesPares: 20 },
    });
    expect(ficha.nivelGeral).toBe("ok");
    expect(ficha.redFlags.map((r) => r.nivel)).toEqual(["sem_dado", "sem_dado", "sem_dado", "ok"]);
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
