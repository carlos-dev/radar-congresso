import { describe, it, expect } from "vitest";
import { parseFavorecidos } from "../../../src/ingestion/transparencia/favorecidos";
import fixture from "../../fixtures/transparencia-documentos.json";

describe("parseFavorecidos", () => {
  it("normaliza favorecidos e classifica PF/PJ, marcando órgão público", () => {
    const out = parseFavorecidos(fixture, 2024);
    expect(out).toEqual([
      { doc: "12.345.678/0001-90", nome: "CONSTRUTORA XPTO LTDA", tipoPessoa: "PJ", valorPago: 900000, ano: 2024, publico: false },
      { doc: "00.111.222/0001-33", nome: "PREFEITURA MUNICIPAL DE EXEMPLO", tipoPessoa: "PJ", valorPago: 50000, ano: 2024, publico: true },
    ]);
  });
});
