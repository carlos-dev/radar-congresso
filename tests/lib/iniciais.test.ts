import { describe, it, expect } from "vitest";
import { iniciais } from "@/lib/iniciais";

describe("iniciais", () => {
  it("usa a primeira e a última palavra relevante", () => {
    expect(iniciais("Ana Maria Silva")).toBe("AS");
  });

  it("ignora conectivos curtos (de, da, dos)", () => {
    expect(iniciais("João de Souza")).toBe("JS");
  });

  it("funciona com um nome único", () => {
    expect(iniciais("Beltrano")).toBe("B");
  });
});
