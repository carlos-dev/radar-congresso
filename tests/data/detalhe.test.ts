import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { detalheCota, listaProjetos, listaEmendas } from "../../src/data/detalhe";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "det-1", nome: "Detalhe Teste", uf: "SP" } });
  id = p.id;
  await prisma.despesa.createMany({ data: [
    { parlamentarId: id, ano: 2025, mes: 1, tipo: "X", fornecedorNome: "Forn A", fornecedorDoc: "1", valor: 300 },
    { parlamentarId: id, ano: 2025, mes: 2, tipo: "X", fornecedorNome: "Forn A", fornecedorDoc: "1", valor: 200 },
    { parlamentarId: id, ano: 2025, mes: 1, tipo: "Y", fornecedorNome: "Forn B", fornecedorDoc: "2", valor: 100 },
  ] });
  await prisma.proposicao.create({ data: { externalId: "det-prop-1", parlamentarId: id, tipo: "PL", ano: 2024, ementa: "Projeto de teste." } });
  await prisma.favorecido.create({ data: { parlamentarId: id, codigoEmenda: "E1", doc: "9", nome: "Benef X", tipoPessoa: "PJ", valorPago: 5000, ano: 2024 } });
});
afterAll(async () => {
  await prisma.favorecido.deleteMany({ where: { parlamentarId: id } });
  await prisma.proposicao.deleteMany({ where: { parlamentarId: id } });
  await prisma.despesa.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("detalhe", () => {
  it("detalheCota agrega por fornecedor, ordenado por total", async () => {
    const r = await detalheCota(id, 2025);
    expect(r.total).toBe(600);
    expect(r.fornecedores[0]).toMatchObject({ nome: "Forn A", total: 500, qtd: 2 });
    expect(r.fornecedores[1]).toMatchObject({ nome: "Forn B", total: 100, qtd: 1 });
  });
  it("listaProjetos retorna as proposições com total", async () => {
    const r = await listaProjetos(id, 1);
    expect(r.total).toBe(1);
    expect(r.itens[0]).toMatchObject({ tipo: "PL", ano: 2024, ementa: "Projeto de teste." });
  });
  it("listaEmendas agrega por beneficiário", async () => {
    const r = await listaEmendas(id);
    expect(r[0]).toMatchObject({ nome: "Benef X", total: 5000 });
  });
});
