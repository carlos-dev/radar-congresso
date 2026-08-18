import { describe, it, expect } from "vitest";
import { semAutoDoacao, ehInstitucional } from "../../src/data/investigacao";

describe("ehInstitucional", () => {
  it("detecta agentes financeiros por nome e por raiz de CNPJ", () => {
    expect(ehInstitucional("BANCO DO BRASIL SA", "00000000000191")).toBe(true);
    expect(ehInstitucional("CAIXA ECONOMICA FEDERAL", "00360305000104")).toBe(true);
    expect(ehInstitucional("Qualquer coisa", "00360305000104")).toBe(true); // raiz Caixa
    expect(ehInstitucional("HOSPITAL SAO VICENTE", "12345678000199")).toBe(false);
  });
});

const d = (doadorNome: string, doadorDoc: string) => ({ doadorNome, doadorDoc, valor: 100, ano: 2022 });

describe("semAutoDoacao", () => {
  it("remove doação do próprio parlamentar por CPF", () => {
    const doacoes = [d("FULANO DE TAL", "12345678900"), d("EMPRESA X", "11222333000199")];
    const r = semAutoDoacao(doacoes, "123.456.789-00", "Fulano de Tal");
    expect(r.map((x) => x.doadorNome)).toEqual(["EMPRESA X"]);
  });

  it("remove por nome mesmo sem CPF (nome civil vs urna)", () => {
    const doacoes = [d("JOSE ANTONIO DOS SANTOS", "999"), d("DOADOR REAL", "888")];
    const r = semAutoDoacao(doacoes, null, "José Antônio dos Santos");
    expect(r.map((x) => x.doadorNome)).toEqual(["DOADOR REAL"]);
  });

  it("não remove doador de doc/nome vazio quando parlamentar sem CPF", () => {
    const doacoes = [d("DOADOR", "")];
    const r = semAutoDoacao(doacoes, null, "Alguém");
    expect(r).toHaveLength(1);
  });
});
