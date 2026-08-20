import { describe, it, expect } from "vitest";
import { montarPromptLegibilidade, parseLegibilidade } from "../../src/analysis/legibilidade";

describe("legibilidade", () => {
  it("monta prompt ancorado no texto oficial", () => {
    const p = montarPromptLegibilidade({ descricao: "Aprovado o Substitutivo à PEC 45", tipo: "PEC", resultado: "aprovada" });
    expect(p).toContain("PEC 45");
    expect(p).toMatch(/JSON/i);
  });
  it("inclui o título curado como âncora do assunto quando presente", () => {
    const p = montarPromptLegibilidade({ descricao: "Aprovada a PEC nº 45", tipo: "PEC", resultado: "aprovada", titulo: "Reforma Tributária" });
    expect(p).toContain("Reforma Tributária");
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
  it("extrai o bloco cercado mesmo com prosa (que tem chaves) em volta", () => {
    const raw = 'Analisando {a votação}:\n```json\n{"resumoCidadao":"r","significadoSim":"s","significadoNao":"n"}\n```\nPronto!';
    expect(parseLegibilidade(raw)).toEqual({ resumoCidadao: "r", significadoSim: "s", significadoNao: "n" });
  });
  it("rejeita JSON incompleto ou lixo", () => {
    expect(parseLegibilidade('{"resumoCidadao":"x"}')).toBeNull();
    expect(parseLegibilidade("não é json")).toBeNull();
  });
});
