import { describe, it, expect } from "vitest";
import { parseProposicoesMeta, parseAutorias } from "../../../src/ingestion/camara/proposicoes-bulk";

describe("parseProposicoesMeta", () => {
  it("extrai metadados e deriva virouLei da situação", () => {
    const csv =
      '"id";"siglaTipo";"ano";"ementa";"ultimoStatus_descricaoSituacao"\n' +
      '"111";"PL";"2023";"Dispõe sobre X.";"Transformado em Norma Jurídica"\n' +
      '"222";"REQ";"2024";"Requer Y.";"Aguardando Parecer"';
    const r = parseProposicoesMeta(csv);
    expect(r[0]).toEqual({
      externalId: "111", tipo: "PL", ano: 2023, ementa: "Dispõe sobre X.",
      situacao: "Transformado em Norma Jurídica", virouLei: true,
    });
    expect(r[1]).toMatchObject({ situacao: "Aguardando Parecer", virouLei: false });
  });
});

describe("parseAutorias", () => {
  it("mantém só deputados (com id) e marca principal pelo proponente", () => {
    const csv =
      '"idProposicao";"idDeputadoAutor";"proponente"\n' +
      '"111";"204536";"1"\n' + // deputado, proponente
      '"111";"220645";"0"\n' + // deputado, co-autor
      '"111";"";"1"'; // Senado/órgão (sem id) → ignora
    const r = parseAutorias(csv);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ idProposicao: "111", externalIdDeputado: "204536", principal: true });
    expect(r[1].principal).toBe(false);
  });
});
