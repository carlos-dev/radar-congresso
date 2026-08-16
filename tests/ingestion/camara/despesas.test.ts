import { describe, it, expect } from "vitest";
import { parseDespesas } from "../../../src/ingestion/camara/despesas";
import fixture from "../../fixtures/camara-despesas.json";

describe("parseDespesas", () => {
  it("normaliza despesas da cota", () => {
    const out = parseDespesas(fixture);
    expect(out).toEqual([
      { ano: 2025, mes: 3, tipo: "COMBUSTÍVEIS", fornecedorNome: "Posto ABC", fornecedorDoc: "00.000.000/0001-00", valor: 1500.5 },
    ]);
  });
});
