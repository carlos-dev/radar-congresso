import { describe, it, expect } from "vitest";
import { nivelPorPercentil, pctInt } from "../../src/analysis/percentil";

describe("nivelPorPercentil", () => {
  it("top 10% pior → alerta", () => {
    expect(nivelPorPercentil(0.95)).toBe("alerta");
    expect(nivelPorPercentil(0.9)).toBe("alerta");
  });
  it("entre 75% e 90% → atenção", () => {
    expect(nivelPorPercentil(0.8)).toBe("atencao");
    expect(nivelPorPercentil(0.75)).toBe("atencao");
  });
  it("abaixo de 75% → ok", () => {
    expect(nivelPorPercentil(0.5)).toBe("ok");
    expect(nivelPorPercentil(0)).toBe("ok");
  });
});

describe("pctInt", () => {
  it("converte fração em inteiro percentual", () => {
    expect(pctInt(0.873)).toBe(87);
  });
});
