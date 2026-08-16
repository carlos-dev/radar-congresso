import { describe, it, expect } from "vitest";
import { parseSenadores } from "../../../src/ingestion/senado/senadores";
import fixture from "../../fixtures/senado-senadores.json";

describe("parseSenadores", () => {
  it("normaliza a lista do Senado", () => {
    const out = parseSenadores(fixture);
    expect(out).toEqual([
      { externalId: "5000", casa: "SENADO", nome: "Beltrana", partido: "ABC", uf: "BA", urlFoto: "http://foto/5000.jpg" },
    ]);
  });
});
