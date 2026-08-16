import { describe, it, expect } from "vitest";
import { detectarConexoes } from "../../src/analysis/conexoes";

const doador = { nome: "João da Silva", doc: "***.456.789-**", valor: 5000, ano: 2022 };

describe("detectarConexoes", () => {
  it("match DIRETO: doador é o próprio favorecido (PF)", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        { doc: "***.456.789-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 20000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("DIRETA");
    expect(cx[0].confianca).toBe("alta");
    expect(cx[0].valorEmenda).toBe(20000);
  });

  it("match por SÓCIO: doador é sócio da empresa beneficiária", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        {
          doc: "12.345.678/0001-90", nome: "Construtora XPTO", tipoPessoa: "PJ", valorPago: 900000, ano: 2024,
          socios: [{ nome: "João da Silva", doc: "***.456.789-**" }],
        },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].empresaNome).toBe("Construtora XPTO");
    expect(cx[0].confianca).toBe("alta");
  });

  it("rejeita HOMÔNIMO: mesmo nome, dígitos de CPF diferentes", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        { doc: "***.111.222-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 1000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(0);
  });

  it("confiança 'media' quando só o nome bate (sem dígitos de CPF)", () => {
    const cx = detectarConexoes({
      doadores: [{ nome: "Maria Souza", doc: "", valor: 3000, ano: 2022 }],
      beneficiarios: [
        { doc: "", nome: "Maria Souza", tipoPessoa: "PF", valorPago: 5000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].confianca).toBe("media");
  });
});
