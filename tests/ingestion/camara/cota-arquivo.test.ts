import { describe, it, expect } from "vitest";
import { parseLinhaCota } from "../../../src/ingestion/camara/cota-arquivo";

describe("parseLinhaCota", () => {
  it("normaliza uma linha da CEAP em massa", () => {
    const linha = {
      txNomeParlamentar: "Tabata Amaral",
      sgUF: "SP",
      numAno: "2024",
      numMes: "2",
      txtDescricao: "MANUTENÇÃO DE ESCRITÓRIO",
      txtFornecedor: "AMORETTO CAFES EXPRESSO LTDA",
      txtCNPJCPF: "085.324.290/0013-1",
      vlrLiquido: "1148.7",
    };
    expect(parseLinhaCota(linha)).toEqual({
      nomeParlamentar: "Tabata Amaral",
      uf: "SP",
      ano: 2024,
      mes: 2,
      tipo: "MANUTENÇÃO DE ESCRITÓRIO",
      fornecedorNome: "AMORETTO CAFES EXPRESSO LTDA",
      fornecedorDoc: "085.324.290/0013-1",
      valor: 1148.7,
    });
  });

  it("aceita valor em formato brasileiro e doc vazio", () => {
    const out = parseLinhaCota({
      txNomeParlamentar: "X", sgUF: "SP", numAno: "2024", numMes: "3", txtDescricao: "X",
      txtFornecedor: "Y", txtCNPJCPF: "", vlrLiquido: "1.234,56",
    });
    expect(out.valor).toBe(1234.56);
    expect(out.fornecedorDoc).toBeNull();
  });
});
