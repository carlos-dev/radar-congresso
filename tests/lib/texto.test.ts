import { describe, it, expect } from "vitest";
import { normalizaNome, soDigitos } from "../../src/lib/texto";

describe("normalizaNome", () => {
  it("tira acento, maiúsculas, colapsa espaços", () => {
    expect(normalizaNome("  Tábata   Amaral ")).toBe("TABATA AMARAL");
  });
});

describe("soDigitos", () => {
  it("mantém só os dígitos visíveis de um CPF mascarado", () => {
    expect(soDigitos("***.456.789-**")).toBe("456789");
    expect(soDigitos("12.345.678/0001-90")).toBe("12345678000190");
  });
});
