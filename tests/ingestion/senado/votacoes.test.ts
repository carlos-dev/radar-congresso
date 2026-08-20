import { describe, it, expect } from "vitest";
import { parseVotacoesSenado } from "../../../src/ingestion/senado/votacoes";

const amostra = {
  ListaVotacoes: { Votacoes: { Votacao: [
    { CodigoSessaoVotacao: "6966", DataSessao: "2025-08-13", Secreta: "N",
      DescricaoVotacao: "Votação do PL 123", SiglaMateria: "PL", NumeroMateria: "123", AnoMateria: "2025",
      Votos: { VotoParlamentar: [
        { CodigoParlamentar: "22", Voto: "Sim" },
        { CodigoParlamentar: "70", Voto: "Não" },
      ] } },
    { CodigoSessaoVotacao: "9", DataSessao: "2025-08-14", Secreta: "S",
      DescricaoVotacao: "Sabatina X", Votos: { VotoParlamentar: [ { CodigoParlamentar: "22", Voto: "Votou" } ] } },
  ] } },
};

describe("parseVotacoesSenado", () => {
  it("normaliza votações e votos, marcando secretas como SIGILOSO", () => {
    const r = parseVotacoesSenado(amostra);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ externalId: "6966", secreta: false, descricao: "Votação do PL 123" });
    expect(r[0].votos).toEqual([
      { codigoParlamentar: "22", voto: "SIM" },
      { codigoParlamentar: "70", voto: "NAO" },
    ]);
    expect(r[1].secreta).toBe(true);
    expect(r[1].votos[0].voto).toBe("SIGILOSO");
  });
});
