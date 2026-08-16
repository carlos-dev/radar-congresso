import { describe, it, expect } from "vitest";
import { ordemDeIngestao } from "../../src/ingestion/run-all";

describe("run-all", () => {
  it("ingere identidades antes de dados dependentes", () => {
    const ordem = ordemDeIngestao();
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("despesas"));
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("votacoes"));
    expect(ordem.indexOf("senadores")).toBeLessThan(ordem.indexOf("emendas"));
  });

  it("ingere doações e favorecidos antes de sócios e conexões", () => {
    const ordem = ordemDeIngestao();
    expect(ordem.indexOf("doacoes")).toBeLessThan(ordem.indexOf("socios"));
    expect(ordem.indexOf("favorecidos")).toBeLessThan(ordem.indexOf("socios"));
    expect(ordem.indexOf("socios")).toBeLessThan(ordem.indexOf("conexoes"));
  });
});
