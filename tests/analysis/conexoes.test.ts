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

  it("casa CPF completo (TSE) com mascarado (sócio) pelos 6 dígitos do meio", () => {
    // Doador com CPF completo 507.853.039-87 (11 díg.), sócio mascarado ***.853.039-**.
    // A janela do meio de "50785303987" é "853039" — deve casar.
    const cx = detectarConexoes({
      doadores: [{ nome: "Ana Prado", doc: "507.853.039-87", valor: 4000, ano: 2022 }],
      beneficiarios: [
        {
          doc: "98.765.432/0001-10", nome: "Prado Serviços", tipoPessoa: "PJ", valorPago: 500000, ano: 2024,
          socios: [{ nome: "Ana Prado", doc: "***.853.039-**" }],
        },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].confianca).toBe("alta");
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

  it("fragmento curto de dígitos NÃO vira 'alta' (cai para 'media')", () => {
    const cx = detectarConexoes({
      doadores: [{ nome: "João da Silva", doc: "***.789-**", valor: 5000, ano: 2022 }],
      beneficiarios: [
        { doc: "***.456.789-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 20000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].confianca).toBe("media");
    expect(cx[0].confianca).not.toBe("alta");
  });

  it("dois CPFs válidos completos que diferem, mesmo nome → rejeita", () => {
    const cx = detectarConexoes({
      doadores: [{ nome: "João da Silva", doc: "***.456.789-**", valor: 5000, ano: 2022 }],
      beneficiarios: [
        { doc: "***.111.222-**", nome: "João da Silva", tipoPessoa: "PF", valorPago: 1000, ano: 2024, socios: [] },
      ],
    });
    expect(cx).toHaveLength(0);
  });

  it("SOCIO: mantém a melhor confiança quando há múltiplos sócios homônimos", () => {
    const cx = detectarConexoes({
      doadores: [doador],
      beneficiarios: [
        {
          doc: "12.345.678/0001-90", nome: "Construtora XPTO", tipoPessoa: "PJ", valorPago: 900000, ano: 2024,
          socios: [
            { nome: "João da Silva", doc: "" }, // só nome → media
            { nome: "João da Silva", doc: "***.456.789-**" }, // nome + dígitos → alta
          ],
        },
      ],
    });
    expect(cx).toHaveLength(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].confianca).toBe("alta");
  });
});
