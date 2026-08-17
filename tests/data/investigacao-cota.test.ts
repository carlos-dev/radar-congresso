import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { obterConexoesCota } from "../../src/data/investigacao";
import { ANO_REFERENCIA } from "../../src/lib/config";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "cota-1", nome: "Cota Teste", uf: "SP" } });
  id = p.id;
  // Doador com CPF completo; fornecedor da cota (CNPJ) cujo sócio é o doador (CPF mascarado).
  await prisma.doacao.create({ data: { parlamentarId: id, doadorNome: "Ana Prado", doadorDoc: "507.853.039-87", valor: 4000, ano: 2022 } });
  await prisma.despesa.create({ data: { parlamentarId: id, ano: ANO_REFERENCIA, mes: 1, tipo: "X", fornecedorNome: "Prado Serviços", fornecedorDoc: "98.765.432/0001-10", valor: 12000 } });
  await prisma.socio.create({ data: { cnpj: "98765432000110", nome: "Ana Prado", doc: "***.853.039-**" } });
});
afterAll(async () => {
  await prisma.socio.deleteMany({ where: { cnpj: "98765432000110" } });
  await prisma.despesa.deleteMany({ where: { parlamentarId: id } });
  await prisma.doacao.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("obterConexoesCota", () => {
  it("acha doador que é sócio de fornecedor da cota", async () => {
    const cx = await obterConexoesCota(id);
    expect(cx.length).toBeGreaterThanOrEqual(1);
    expect(cx[0].tipo).toBe("SOCIO");
    expect(cx[0].empresaNome).toBe("Prado Serviços");
  });
});
