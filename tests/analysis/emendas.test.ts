import { describe, it, expect } from "vitest";
import { redFlagEmendas } from "../../src/analysis/emendas";

describe("redFlagEmendas", () => {
  it("alerta quando emendas concentradas em um município", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porMunicipio: [{ municipio: "Salvador", valor: 900000 }, { municipio: "Feira", valor: 100000 }],
    });
    expect(rf.nivel).toBe("alerta");
    expect(rf.fraseSimples).toContain("Salvador");
    expect(rf.fraseSimples).toContain("90%");
  });

  it("ok quando distribuído", () => {
    const rf = redFlagEmendas({
      total: 1000000,
      porMunicipio: [{ municipio: "A", valor: 300000 }, { municipio: "B", valor: 350000 }, { municipio: "C", valor: 350000 }],
    });
    expect(rf.nivel).toBe("ok");
  });

  it("sem_dado quando não há emendas", () => {
    const rf = redFlagEmendas({ total: 0, porMunicipio: [] });
    expect(rf.nivel).toBe("sem_dado");
  });
});
