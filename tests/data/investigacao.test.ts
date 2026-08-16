import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { obterConexoes } from "../../src/data/investigacao";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "inv-1", nome: "Fulano Teste", uf: "SP" } });
  id = p.id;
  await prisma.doacao.create({ data: { parlamentarId: id, doadorNome: "João da Silva", doadorDoc: "***.456.789-**", valor: 5000, ano: 2022 } });
  await prisma.favorecido.create({ data: { parlamentarId: id, codigoEmenda: "E1", doc: "12.345.678/0001-90", nome: "Construtora XPTO", tipoPessoa: "PJ", valorPago: 900000, ano: 2024 } });
  await prisma.socio.create({ data: { cnpj: "12345678000190", nome: "João da Silva", doc: "***.456.789-**" } });
});
afterAll(async () => {
  await prisma.conexao.deleteMany({ where: { parlamentarId: id } });
  await prisma.socio.deleteMany({ where: { cnpj: "12345678000190" } });
  await prisma.favorecido.deleteMany({ where: { parlamentarId: id } });
  await prisma.doacao.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("obterConexoes", () => {
  it("encontra o vínculo doador↔sócio de beneficiário", async () => {
    const cx = await obterConexoes(id);
    expect(cx.length).toBeGreaterThanOrEqual(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].empresaNome).toBe("Construtora XPTO");
  });
});
