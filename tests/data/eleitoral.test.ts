import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { perfilEleitoral } from "../../src/data/eleitoral";

let id: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({
    data: { casa: "CAMARA", externalId: "eleit-1", nome: "Eleitoral Teste", uf: "SP" },
  });
  id = p.id;
  await prisma.candidatura.createMany({
    data: [
      { parlamentarId: id, ano: 2018, cargo: "DEPUTADO FEDERAL", situacao: "APTO", resultado: "ELEITO", patrimonio: 100000 },
      { parlamentarId: id, ano: 2022, cargo: "DEPUTADO FEDERAL", situacao: "INAPTO", resultado: "ELEITO", patrimonio: 300000 },
    ],
  });
});
afterAll(async () => {
  await prisma.candidatura.deleteMany({ where: { parlamentarId: id } });
  await prisma.parlamentar.delete({ where: { id } });
});

describe("perfilEleitoral", () => {
  it("calcula crescimento patrimonial e detecta inaptidão", async () => {
    const r = await perfilEleitoral(id);
    expect(r.candidaturas.map((c) => c.ano)).toEqual([2018, 2022]); // ordem crescente
    expect(r.crescimentoPct).toBe(200); // 100k -> 300k
    expect(r.temInapto).toBe(true);
  });

  it("retorna vazio para quem não tem candidatura", async () => {
    const r = await perfilEleitoral("id-inexistente");
    expect(r.candidaturas).toEqual([]);
    expect(r.crescimentoPct).toBeNull();
    expect(r.temInapto).toBe(false);
  });
});
