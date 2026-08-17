import { describe, it, expect } from "vitest";
import { parseVotacoesMeta, parseVotosArquivo } from "../../../src/ingestion/camara/votacoes-arquivo";

describe("parseVotacoesMeta", () => {
  it("extrai id, data, descrição e órgão", () => {
    const csv =
      '"id";"data";"dataHoraRegistro";"siglaOrgao";"descricao"\n' +
      '"2458405-38";"2025-02-04";"2025-02-04T17:09:33";"PLEN";"Aprovado o texto; com ressalvas"';
    const r = parseVotacoesMeta(csv);
    expect(r).toHaveLength(1);
    expect(r[0].externalId).toBe("2458405-38");
    expect(r[0].orgao).toBe("PLEN");
    expect(r[0].descricao).toBe("Aprovado o texto; com ressalvas");
    expect(r[0].data.getUTCFullYear()).toBe(2025);
  });
});

describe("parseVotosArquivo", () => {
  it("mapeia voto e ignora tipos não reconhecidos", () => {
    const csv =
      '"idVotacao";"voto";"deputado_id"\n' +
      '"106701-223";"Sim";"204379"\n' +
      '"106701-223";"Não";"220714"\n' +
      '"106701-223";"Artigo 17";"999999"';
    const r = parseVotosArquivo(csv);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ idVotacao: "106701-223", deputadoExternalId: "204379", voto: "SIM" });
    expect(r[1].voto).toBe("NAO");
  });
});
