import { describe, it, expect } from "vitest";
import { slugParlamentar, externalIdDoSlug } from "@/lib/slug";

describe("slugParlamentar", () => {
  it("gera slug com nome + id oficial", () => {
    expect(slugParlamentar("Kim Kataguiri", "204536")).toBe("kim-kataguiri-204536");
  });

  it("remove acentos", () => {
    expect(slugParlamentar("Esperidião Amin", "22")).toBe("esperidiao-amin-22");
  });
});

describe("externalIdDoSlug", () => {
  it("extrai o id oficial do fim do slug", () => {
    expect(externalIdDoSlug("kim-kataguiri-204536")).toBe("204536");
  });

  it("retorna null quando não há sufixo numérico", () => {
    expect(externalIdDoSlug("cuidsemtraco")).toBeNull();
  });
});
