import { prisma } from "../db/client";

export interface CandidaturaResumo {
  ano: number;
  cargo: string;
  situacao: string | null; // APTO / INAPTO
  resultado: string | null; // ELEITO / SUPLENTE / NÃO ELEITO
  patrimonio: number | null;
}

export interface PerfilEleitoral {
  candidaturas: CandidaturaResumo[]; // ordem crescente por ano
  crescimentoPct: number | null; // entre a primeira e a última eleição com patrimônio
  temInapto: boolean;
}

export async function perfilEleitoral(parlamentarId: string): Promise<PerfilEleitoral> {
  const cs = await prisma.candidatura.findMany({
    where: { parlamentarId },
    orderBy: { ano: "asc" },
  });

  const comPat = cs.filter((c) => c.patrimonio != null);
  let crescimentoPct: number | null = null;
  if (comPat.length >= 2) {
    const ini = comPat[0].patrimonio as number;
    const fim = comPat[comPat.length - 1].patrimonio as number;
    if (ini > 0) crescimentoPct = Math.round(((fim - ini) / ini) * 100);
  }

  return {
    candidaturas: cs.map((c) => ({
      ano: c.ano,
      cargo: c.cargo,
      situacao: c.situacao,
      resultado: c.resultado,
      patrimonio: c.patrimonio,
    })),
    crescimentoPct,
    temInapto: cs.some((c) => (c.situacao ?? "").toUpperCase() === "INAPTO"),
  };
}
