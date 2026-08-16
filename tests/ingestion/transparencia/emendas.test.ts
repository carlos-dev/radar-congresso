import { describe, it, expect } from "vitest";
import { parseEmendas } from "../../../src/ingestion/transparencia/emendas";
import fixture from "../../fixtures/transparencia-emendas.json";

describe("parseEmendas", () => {
  it("normaliza emendas e separa município/uf", () => {
    const out = parseEmendas(fixture);
    expect(out).toEqual([
      { ano: 2024, funcao: "Saúde", municipioBeneficiario: "Salvador", uf: "BA", valorEmpenhado: 100000, valorPago: 50000 },
    ]);
  });

  it("aceita valores em formato brasileiro e funcao ausente", () => {
    const out = parseEmendas([
      { ano: 2024, localidadeDoGasto: "Recife - PE", valorEmpenhado: "1.500.000,00", valorPago: "250.000,50" },
    ] as any);
    expect(out[0]).toEqual({
      ano: 2024, funcao: null, municipioBeneficiario: "Recife", uf: "PE",
      valorEmpenhado: 1500000, valorPago: 250000.5,
    });
  });
});
