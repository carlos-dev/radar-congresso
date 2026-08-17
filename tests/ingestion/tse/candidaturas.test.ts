import { describe, it, expect } from "vitest";
import { parseCandidaturas, parseBensPorCandidato } from "../../../src/ingestion/tse/candidaturas";

describe("parseCandidaturas", () => {
  it("mantém só cargos federais e extrai os campos", () => {
    const csv =
      '"ANO_ELEICAO";"DS_CARGO";"SQ_CANDIDATO";"NR_CPF_CANDIDATO";"DS_SITUACAO_CANDIDATURA";"DS_SIT_TOT_TURNO"\n' +
      '"2022";"DEPUTADO FEDERAL";"SQ1";"11122233344";"APTO";"ELEITO POR QP"\n' +
      '"2022";"VEREADOR";"SQ2";"55566677788";"APTO";"ELEITO"\n' +
      '"2026";"DEPUTADO FEDERAL";"SQ3";"99988877766";"#NE";"#NE"';
    const r = parseCandidaturas(csv);
    expect(r).toHaveLength(2); // vereador fora
    expect(r[0]).toEqual({
      sqCandidato: "SQ1", cpf: "11122233344", ano: 2022,
      cargo: "DEPUTADO FEDERAL", situacao: "APTO", resultado: "ELEITO POR QP",
    });
    // tokens "#NE" do TSE (não julgado) viram string vazia
    expect(r[1].situacao).toBe("");
    expect(r[1].resultado).toBe("");
  });
});

describe("parseBensPorCandidato", () => {
  it("soma o valor dos bens por SQ_CANDIDATO (formato BR)", () => {
    const csv =
      '"SQ_CANDIDATO";"VR_BEM_CANDIDATO"\n' +
      '"SQ1";"100.000,50"\n' +
      '"SQ1";"1.000,00"\n' +
      '"SQ2";"250,00"';
    const m = parseBensPorCandidato(csv);
    expect(m.get("SQ1")).toBeCloseTo(101000.5, 2);
    expect(m.get("SQ2")).toBe(250);
  });
});
