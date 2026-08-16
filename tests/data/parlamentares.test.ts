import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { listarParlamentares, obterPerfil } from "../../src/data/parlamentares";

let id: string;

beforeAll(async () => {
  const p = await prisma.parlamentar.create({
    data: { casa: "CAMARA", externalId: "test-1", nome: "Teste Silva", partido: "ZZZ", uf: "SP" },
  });
  id = p.id;
});

afterAll(async () => {
  await prisma.parlamentar.delete({ where: { id } });
});

describe("data access", () => {
  it("lista parlamentares com busca por nome", async () => {
    const lista = await listarParlamentares("Teste");
    expect(lista.some((p) => p.id === id)).toBe(true);
  });

  it("obtém perfil com ficha", async () => {
    const perfil = await obterPerfil(id);
    expect(perfil?.nome).toBe("Teste Silva");
    expect(perfil?.ficha.redFlags).toHaveLength(4);
  });
});
