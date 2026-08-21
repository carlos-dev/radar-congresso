import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { parseCsvObjetos } from "../../lib/csv";
import { virouLeiPorSituacao } from "./proposicoes-status";
import { TIPOS_PROJETO } from "../../lib/proposicoes";

export interface ProposicaoMeta {
  externalId: string;
  tipo: string;
  ano: number;
  ementa: string;
  situacao: string;
  virouLei: boolean;
}

/** Parseia proposicoes-AAAA.csv (metadados + situação de tramitação). */
export function parseProposicoesMeta(csv: string): ProposicaoMeta[] {
  return parseCsvObjetos(csv).map((r) => {
    const situacao = (r["ultimoStatus_descricaoSituacao"] ?? "").trim();
    return {
      externalId: r["id"],
      tipo: r["siglaTipo"],
      ano: Number(r["ano"]) || 0,
      ementa: r["ementa"] ?? "",
      situacao,
      virouLei: virouLeiPorSituacao(situacao),
    };
  });
}

export interface AutoriaBruta {
  idProposicao: string;
  externalIdDeputado: string;
  principal: boolean;
}

/**
 * Parseia proposicoesAutores-AAAA.csv, só linhas de deputado (com id).
 * `principal` = 1ª assinatura (ordemAssinatura=1) — o autor de fato. NÃO usar
 * `proponente`, que vem marcado em vários autores de projetos coletivos.
 */
export function parseAutorias(csv: string): AutoriaBruta[] {
  const out: AutoriaBruta[] = [];
  for (const r of parseCsvObjetos(csv)) {
    const dep = (r["idDeputadoAutor"] ?? "").trim();
    if (!dep) continue; // autor é Senado/órgão, não deputado
    out.push({
      idProposicao: r["idProposicao"],
      externalIdDeputado: dep,
      principal: (r["ordemAssinatura"] ?? "").trim() === "1",
    });
  }
  return out;
}

async function createManyBatched<T>(
  rows: T[],
  fn: (chunk: T[]) => Promise<void>,
  lote = 5000,
): Promise<void> {
  for (let i = 0; i < rows.length; i += lote) await fn(rows.slice(i, i + lote));
}

/**
 * Ingere proposições e autorias de um ano a partir dos arquivos em massa.
 * Só entram proposições com ao menos um autor que seja deputado atual da Câmara.
 * `principal` = proponente (1ª assinatura). Reconstrói (upsert) por externalId.
 */
export async function ingestProposicoesBulk(
  proposicoesCsvPath: string,
  autoresCsvPath: string,
): Promise<{ proposicoes: number; autorias: number }> {
  const [propCsv, autoresCsv] = await Promise.all([
    readFile(proposicoesCsvPath, "utf8"),
    readFile(autoresCsvPath, "utf8"),
  ]);

  // Só matérias de projeto (PL/PLP/PEC/PDL...). Acessórias (REQ/RIC/RPD/EMC...)
  // nunca são exibidas pelo app — não importamos, pra não inchar o banco.
  const projeto = new Set(TIPOS_PROJETO);
  const metas = parseProposicoesMeta(propCsv).filter((m) => projeto.has(m.tipo));
  const metaPorId = new Map(metas.map((m) => [m.externalId, m]));

  const deputados = await prisma.parlamentar.findMany({
    where: { casa: "CAMARA" },
    select: { id: true, externalId: true },
  });
  const pidPorExternal = new Map(deputados.map((d) => [d.externalId, d.id]));

  // Agrupa autorias (de deputados atuais) por proposição.
  const autoriasPorProp = new Map<string, { parlamentarId: string; principal: boolean }[]>();
  for (const a of parseAutorias(autoresCsv)) {
    const pid = pidPorExternal.get(a.externalIdDeputado);
    if (!pid || !metaPorId.has(a.idProposicao)) continue;
    const arr = autoriasPorProp.get(a.idProposicao);
    const reg = { parlamentarId: pid, principal: a.principal };
    if (arr) arr.push(reg);
    else autoriasPorProp.set(a.idProposicao, [reg]);
  }

  // Proposições a inserir: as que têm ao menos um autor deputado atual.
  const externalIds = [...autoriasPorProp.keys()];
  await createManyBatched(externalIds, async (chunk) => {
    await prisma.proposicao.createMany({
      data: chunk.map((eid) => {
        const m = metaPorId.get(eid)!;
        return { externalId: eid, tipo: m.tipo, ano: m.ano, ementa: m.ementa, situacao: m.situacao, virouLei: m.virouLei };
      }),
      skipDuplicates: true,
    });
  });

  // Mapa externalId → id interno (para ligar autorias).
  const inseridas = await prisma.proposicao.findMany({
    where: { externalId: { in: externalIds } },
    select: { id: true, externalId: true },
  });
  const propIdPorExternal = new Map(inseridas.map((p) => [p.externalId, p.id]));

  // Dedupe por (proposição, parlamentar), mantendo principal se aparecer.
  const autoriaRows: { proposicaoId: string; parlamentarId: string; principal: boolean }[] = [];
  for (const [eid, autores] of autoriasPorProp) {
    const propId = propIdPorExternal.get(eid);
    if (!propId) continue;
    const porDep = new Map<string, boolean>();
    for (const a of autores) porDep.set(a.parlamentarId, (porDep.get(a.parlamentarId) ?? false) || a.principal);
    for (const [parlamentarId, principal] of porDep) {
      autoriaRows.push({ proposicaoId: propId, parlamentarId, principal });
    }
  }
  await createManyBatched(autoriaRows, async (chunk) => {
    await prisma.autoria.createMany({ data: chunk, skipDuplicates: true });
  });

  return { proposicoes: externalIds.length, autorias: autoriaRows.length };
}
