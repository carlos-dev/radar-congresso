import { describe, it, expect } from "vitest";
import { parseSocios } from "../../../src/ingestion/receita/socios";
import fixture from "../../fixtures/brasilapi-cnpj.json";

describe("parseSocios", () => {
  it("extrai o quadro societário da resposta da BrasilAPI", () => {
    expect(parseSocios(fixture)).toEqual([
      { cnpj: "12345678000190", nome: "João da Silva", doc: "***.456.789-**" },
      { cnpj: "12345678000190", nome: "Ana Pereira", doc: "***.222.333-**" },
    ]);
  });
});
