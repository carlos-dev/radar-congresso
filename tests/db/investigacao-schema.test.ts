import { describe, it, expect } from "vitest";
import { prisma } from "../../src/db/client";

describe("schema investigação", () => {
  it("expõe as novas tabelas", async () => {
    expect(typeof (await prisma.doacao.count())).toBe("number");
    expect(typeof (await prisma.favorecido.count())).toBe("number");
    expect(typeof (await prisma.socio.count())).toBe("number");
    expect(typeof (await prisma.conexao.count())).toBe("number");
  });
});
