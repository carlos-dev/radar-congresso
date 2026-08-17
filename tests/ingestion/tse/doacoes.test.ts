import { describe, it, expect } from "vitest";
import { parseLinhaDoacao } from "../../../src/ingestion/tse/doacoes";

describe("parseLinhaDoacao", () => {
  it("normaliza uma linha de receita do TSE", () => {
    const linha = {
      NM_CANDIDATO: "TABATA CLAUDIA AMARAL DE PONTES",
      NR_CPF_CANDIDATO: "123.456.789-09",
      SG_UF: "SP",
      DS_CARGO: "DEPUTADO FEDERAL",
      NM_DOADOR: "João da Silva",
      NR_CPF_CNPJ_DOADOR: "***.456.789-**",
      VR_RECEITA: "5.000,00",
      AA_ELEICAO: "2022",
    };
    expect(parseLinhaDoacao(linha)).toEqual({
      candidatoNome: "TABATA CLAUDIA AMARAL DE PONTES",
      cpfCandidato: "12345678909",
      uf: "SP",
      cargo: "DEPUTADO FEDERAL",
      doadorNome: "João da Silva",
      doadorDoc: "***.456.789-**",
      valor: 5000,
      ano: 2022,
    });
  });
});
