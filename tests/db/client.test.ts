import { describe, it, expect } from "vitest";
import { prisma } from "../../src/db/client";

describe("db client", () => {
  it("conecta e conta parlamentares", async () => {
    const count = await prisma.parlamentar.count();
    expect(typeof count).toBe("number");
  });
});
