import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../src/db/client";
import { pautasQueImportam, votosPorUf } from "../../src/data/pautas";

let pid: string, vid: string;
beforeAll(async () => {
  const p = await prisma.parlamentar.create({ data: { casa: "CAMARA", externalId: "pauta-dep", nome: "Dep PE", uf: "PE" } });
  pid = p.id;
  const v = await prisma.votacao.create({ data: { externalId: "pauta-vot", casa: "CAMARA", data: new Date("2025-01-01"), descricao: "d", destaque: true, resumoCidadao: "resumo", significadoSim: "sim", significadoNao: "nao", votosSim: 300, votosNao: 100 } });
  vid = v.id;
  await prisma.votoRegistro.create({ data: { votacaoId: vid, parlamentarId: pid, voto: "SIM" } });
});
afterAll(async () => {
  await prisma.votoRegistro.deleteMany({ where: { parlamentarId: pid } });
  await prisma.votacao.delete({ where: { id: vid } });
  await prisma.parlamentar.delete({ where: { id: pid } });
});

describe("pautas", () => {
  it("pautasQueImportam traz a votação-destaque com legibilidade", async () => {
    const r = await pautasQueImportam(50);
    const p = r.find((x) => x.id === vid);
    expect(p?.resumoCidadao).toBe("resumo");
  });
  it("votosPorUf agrupa por voto os parlamentares do estado", async () => {
    const r = await votosPorUf([vid], "PE");
    expect(r[vid].SIM.map((x) => x.nome)).toContain("Dep PE");
  });
});
