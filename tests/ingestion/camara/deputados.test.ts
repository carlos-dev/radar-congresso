import { describe, it, expect } from "vitest";
import { parseDeputados } from "../../../src/ingestion/camara/deputados";
import fixture from "../../fixtures/camara-deputados.json";

describe("parseDeputados", () => {
  it("normaliza a lista da Câmara", () => {
    const out = parseDeputados(fixture);
    expect(out).toEqual([
      { externalId: "204554", casa: "CAMARA", nome: "Fulano de Tal", partido: "XPTO", uf: "SP", urlFoto: "http://foto/204554.jpg" },
    ]);
  });
});
