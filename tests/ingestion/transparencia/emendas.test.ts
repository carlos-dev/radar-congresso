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
});
