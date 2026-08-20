import { describe, it, expect } from "vitest";
import { montarPromptLegibilidade, parseLegibilidade } from "../../src/analysis/legibilidade";

describe("legibilidade", () => {
  it("monta prompt ancorado no texto oficial", () => {
    const p = montarPromptLegibilidade({ descricao: "Aprovado o Substitutivo à PEC 45", tipo: "PEC", resultado: "aprovada" });
    expect(p).toContain("PEC 45");
    expect(p).toMatch(/JSON/i);
  });
  it("valida e normaliza o JSON do LLM", () => {
    const raw = '{"resumoCidadao":"Muda impostos.","significadoSim":"A favor.","significadoNao":"Contra."}';
    const r = parseLegibilidade(raw);
    expect(r).toEqual({ resumoCidadao: "Muda impostos.", significadoSim: "A favor.", significadoNao: "Contra." });
  });
  it("extrai JSON mesmo com texto em volta", () => {
    const r = parseLegibilidade('Claro! Aqui:\n{"resumoCidadao":"x","significadoSim":"y","significadoNao":"z"}\nEspero ter ajudado.');
    expect(r).toEqual({ resumoCidadao: "x", significadoSim: "y", significadoNao: "z" });
  });
  it("rejeita JSON incompleto ou lixo", () => {
    expect(parseLegibilidade('{"resumoCidadao":"x"}')).toBeNull();
    expect(parseLegibilidade("não é json")).toBeNull();
  });
});
