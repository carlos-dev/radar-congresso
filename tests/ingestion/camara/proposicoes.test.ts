import { describe, it, expect } from "vitest";
import { parseProposicoes } from "../../../src/ingestion/camara/proposicoes";
import fixture from "../../fixtures/camara-proposicoes.json";

describe("parseProposicoes", () => {
  it("normaliza proposições", () => {
    const out = parseProposicoes(fixture);
    expect(out).toEqual([
      { externalId: "1000", tipo: "PL", ano: 2024, ementa: "Dispõe sobre X.", virouLei: false },
    ]);
  });
});
