import { describe, it, expect } from "vitest";
import { parseVirouLeiIds } from "../../../src/ingestion/camara/proposicoes-status";

describe("parseVirouLeiIds", () => {
  it("pega só as que viraram norma/lei, ignorando fusão e tramitação", () => {
    const csv =
      '"id";"ultimoStatus_descricaoSituacao"\n' +
      '"1";"Transformado em Norma Jurídica"\n' +
      '"2";"Transformado em nova proposição"\n' + // fusão, NÃO conta
      '"3";"Aguardando Parecer"\n' +
      '"4";"Transformada em Lei Ordinária"\n' +
      '"5";"Arquivada"';
    expect(parseVirouLeiIds(csv)).toEqual(["1", "4"]);
  });
});
