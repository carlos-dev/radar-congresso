import { describe, it, expect } from "vitest";
import { parseVotos } from "../../../src/ingestion/camara/votacoes";
import fixture from "../../fixtures/camara-votos.json";

describe("parseVotos", () => {
  it("normaliza tipos de voto", () => {
    const out = parseVotos(fixture);
    expect(out).toEqual([
      { externalIdDeputado: "204554", voto: "SIM" },
      { externalIdDeputado: "999", voto: "NAO" },
      { externalIdDeputado: "111", voto: "OBSTRUCAO" },
      { externalIdDeputado: "222", voto: "ABSTENCAO" },
    ]);
  });
});
