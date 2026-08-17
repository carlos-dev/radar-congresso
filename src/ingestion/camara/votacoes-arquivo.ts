import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { parseCsvObjetos } from "../../lib/csv";
import type { VotoTipo } from "./votacoes";

const MAP: Record<string, VotoTipo> = {
  Sim: "SIM",
  Não: "NAO",
  Nao: "NAO",
  Abstenção: "ABSTENCAO",
  Obstrução: "OBSTRUCAO",
};

export interface VotacaoMeta {
  externalId: string;
  data: Date;
  descricao: string;
  orgao: string;
}

/** Parseia o arquivo `votacoes-AAAA.csv` (metadados: data, descrição, órgão). */
export function parseVotacoesMeta(csv: string): VotacaoMeta[] {
  return parseCsvObjetos(csv).map((r) => ({
    externalId: r["id"],
    data: new Date(r["dataHoraRegistro"] || r["data"]),
    descricao: r["descricao"] ?? "",
    orgao: r["siglaOrgao"] ?? "",
  }));
}

export interface VotoArquivo {
  idVotacao: string;
  deputadoExternalId: string;
  voto: VotoTipo;
}

/** Parseia o arquivo `votacoesVotos-AAAA.csv` (voto individual por deputado). */
export function parseVotosArquivo(csv: string): VotoArquivo[] {
  const out: VotoArquivo[] = [];
  for (const r of parseCsvObjetos(csv)) {
    const voto = MAP[r["voto"]?.trim()];
    if (!voto) continue; // ignora "Artigo 17", presidente etc.
    out.push({ idVotacao: r["idVotacao"], deputadoExternalId: r["deputado_id"], voto });
  }
  return out;
}

/**
 * Ingere votações nominais de plenário a partir dos arquivos anuais da Câmara.
 * Só entram votações cujo órgão é PLEN (as que valem para presença/relevância)
 * e que têm ao menos um voto individual. Idempotente por votação.
 */
export async function ingestVotacoesArquivo(
  votacoesCsvPath: string,
  votosCsvPath: string,
): Promise<{ votacoes: number; votos: number }> {
  const [metaCsv, votosCsv] = await Promise.all([
    readFile(votacoesCsvPath, "utf8"),
    readFile(votosCsvPath, "utf8"),
  ]);

  const metas = parseVotacoesMeta(metaCsv);
  const metaPorId = new Map(metas.map((m) => [m.externalId, m]));
  const votos = parseVotosArquivo(votosCsv);

  // Deputados: externalId (id da API, presente no arquivo) -> id interno.
  const deputados = await prisma.parlamentar.findMany({
    where: { casa: "CAMARA" },
    select: { id: true, externalId: true },
  });
  const pidPorExternal = new Map(deputados.map((d) => [d.externalId, d.id]));

  // Agrupa votos por votação, mantendo só as de plenário com metadados.
  const porVotacao = new Map<string, VotoArquivo[]>();
  for (const v of votos) {
    const meta = metaPorId.get(v.idVotacao);
    if (!meta || meta.orgao !== "PLEN") continue;
    const arr = porVotacao.get(v.idVotacao);
    if (arr) arr.push(v);
    else porVotacao.set(v.idVotacao, [v]);
  }

  let totalVotos = 0;
  const registros: { votacaoId: string; parlamentarId: string; voto: VotoTipo }[] = [];

  for (const [idVotacao, votosDaVotacao] of porVotacao) {
    const meta = metaPorId.get(idVotacao)!;
    const votacao = await prisma.votacao.upsert({
      where: { externalId: idVotacao },
      update: { descricao: meta.descricao, data: meta.data },
      create: { externalId: idVotacao, casa: "CAMARA", data: meta.data, descricao: meta.descricao },
    });
    // Regrava os votos desta votação (idempotência).
    await prisma.votoRegistro.deleteMany({ where: { votacaoId: votacao.id } });
    for (const v of votosDaVotacao) {
      const pid = pidPorExternal.get(v.deputadoExternalId);
      if (!pid) continue;
      registros.push({ votacaoId: votacao.id, parlamentarId: pid, voto: v.voto });
    }
  }

  // createMany em lotes para não estourar parâmetros do driver.
  const LOTE = 5000;
  for (let i = 0; i < registros.length; i += LOTE) {
    const chunk = registros.slice(i, i + LOTE);
    await prisma.votoRegistro.createMany({ data: chunk, skipDuplicates: true });
    totalVotos += chunk.length;
  }

  return { votacoes: porVotacao.size, votos: totalVotos };
}
