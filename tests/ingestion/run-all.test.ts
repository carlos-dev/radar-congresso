import { describe, it, expect } from "vitest";
import { ordemDeIngestao } from "../../src/ingestion/run-all";

describe("run-all", () => {
  it("ingere identidades antes de dados dependentes", () => {
    const ordem = ordemDeIngestao();
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("despesas"));
    expect(ordem.indexOf("deputados")).toBeLessThan(ordem.indexOf("votacoes"));
    expect(ordem.indexOf("senadores")).toBeLessThan(ordem.indexOf("emendas"));
  });
});
