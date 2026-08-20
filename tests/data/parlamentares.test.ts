import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { listarParlamentares, obterPerfil } from "../../src/data/parlamentares";
import { slugParlamentar } from "../../src/lib/slug";

let id: string;
const EXTERNAL_ID = "999888";

beforeAll(async () => {
  const p = await prisma.parlamentar.create({
    data: { casa: "CAMARA", externalId: EXTERNAL_ID, nome: "Teste Silva", partido: "ZZZ", uf: "SP" },
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

  it("obtém perfil com ficha (por cuid, back-compat)", async () => {
    const perfil = await obterPerfil(id);
    expect(perfil?.nome).toBe("Teste Silva");
    expect(perfil?.ficha.redFlags).toHaveLength(4);
  });

  it("obtém perfil por slug (nome + externalId)", async () => {
    const slug = slugParlamentar("Teste Silva", EXTERNAL_ID);
    const perfil = await obterPerfil(slug);
    expect(perfil?.id).toBe(id);
    expect(perfil?.nome).toBe("Teste Silva");
  });
});
