import { describe, it, expect } from "vitest";
import { parseFavorecido } from "../../../src/ingestion/transparencia/favorecidos";

describe("parseFavorecido", () => {
  it("normaliza um favorecido privado (PJ)", () => {
    const doc = {
      codigoFavorecido: "12.345.678/0001-90",
      nomeFavorecido: "CONSTRUTORA XPTO LTDA",
      valor: "900.000,00",
      fase: "Empenho",
    };
    expect(parseFavorecido(doc, 2024)).toEqual({
      doc: "12.345.678/0001-90",
      nome: "CONSTRUTORA XPTO LTDA",
      tipoPessoa: "PJ",
      valorPago: 900000,
      ano: 2024,
      publico: false,
    });
  });

  it("marca órgão público (fundo/prefeitura)", () => {
    const doc = {
      codigoFavorecido: "11.323.261/0001-69",
      nomeFavorecido: "FUNDO MUNICIPAL DE SAUDE",
      valor: "50000.00",
    };
    expect(parseFavorecido(doc, 2024)?.publico).toBe(true);
  });

  it("retorna null sem documento", () => {
    expect(parseFavorecido({ nomeFavorecido: "X" }, 2024)).toBeNull();
  });
});
