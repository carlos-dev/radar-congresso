import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { normalizaNome } from "../../lib/texto";
import { splitCsvLinha } from "../../lib/csv";
import { ANO_MANDATO_INICIO } from "../../lib/config";

// Só emendas individuais (as atribuíveis a um parlamentar). Bancada/comissão/
// relator não são "do deputado".
const ehIndividual = (tipo: string) => /emenda individual/i.test(tipo);

function valorBR(v: string): number {
  const n = Number((v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function tipoPessoa(t: string): string {
  if (/jur[íi]dica/i.test(t)) return "PJ";
  if (/f[íi]sica/i.test(t)) return "PF";
  return "OUTRO";
}

/**
 * Lê um CSV grande (latin1) linha a linha, chamando `onRow` com um objeto
 * {coluna: valor}. Evita carregar todas as linhas como objetos na memória.
 */
async function lerCsvLinhas(caminho: string, onRow: (r: Record<string, string>) => void): Promise<void> {
  const conteudo = (await readFile(caminho, "latin1")).replace(/^﻿/, "");
  const linhas = conteudo.split(/\r?\n/);
  const header = splitCsvLinha(linhas[0]);
  for (let i = 1; i < linhas.length; i++) {
    if (!linhas[i]) continue;
    const cols = splitCsvLinha(linhas[i]);
    const o: Record<string, string> = {};
    header.forEach((h, j) => (o[h] = cols[j] ?? ""));
    onRow(o);
  }
}

async function mapaAutorParaId(): Promise<Map<string, string>> {
  const deps = await prisma.parlamentar.findMany({ select: { id: true, nome: true } });
  return new Map(deps.map((d) => [normalizaNome(d.nome), d.id]));
}

async function inserirEmLotes<T>(rows: T[], fn: (chunk: T[]) => Promise<void>, lote = 5000): Promise<void> {
  for (let i = 0; i < rows.length; i += lote) await fn(rows.slice(i, i + lote));
}

/**
 * Emendas INDIVIDUAIS do mandato (>= 2023) a partir de EmendasParlamentares.csv,
 * casadas por nome do autor. Reconstrói a tabela Emenda.
 */
export async function ingestEmendasArquivo(csvPath: string): Promise<number> {
  const porAutor = await mapaAutorParaId();
  const rows: {
    parlamentarId: string; ano: number; codigoEmenda: string; funcao: string | null;
    municipioBeneficiario: string | null; uf: string | null; valorEmpenhado: number; valorPago: number;
  }[] = [];

  await lerCsvLinhas(csvPath, (r) => {
    const ano = Number(r["Ano da Emenda"]) || 0;
    if (ano < ANO_MANDATO_INICIO || !ehIndividual(r["Tipo de Emenda"] ?? "")) return;
    const pid = porAutor.get(normalizaNome(r["Nome do Autor da Emenda"] ?? ""));
    if (!pid) return;
    rows.push({
      parlamentarId: pid,
      ano,
      codigoEmenda: r["Código da Emenda"] || "",
      funcao: r["Nome Função"] || null,
      municipioBeneficiario: r["Município"] || null,
      uf: r["UF"] || null,
      valorEmpenhado: valorBR(r["Valor Empenhado"]),
      valorPago: valorBR(r["Valor Pago"]),
    });
  });

  await prisma.emenda.deleteMany({});
  await inserirEmLotes(rows, async (chunk) => {
    await prisma.emenda.createMany({ data: chunk });
  });
  return rows.length;
}

/**
 * Favorecidos (beneficiários) de emendas individuais do mandato a partir de
 * EmendasParlamentares_PorFavorecido.csv. Reconstrói a tabela Favorecido.
 */
export async function ingestFavorecidosArquivo(csvPath: string): Promise<number> {
  const porAutor = await mapaAutorParaId();
  const rows: {
    parlamentarId: string; codigoEmenda: string; doc: string; nome: string;
    tipoPessoa: string; valorPago: number; ano: number;
  }[] = [];

  await lerCsvLinhas(csvPath, (r) => {
    if (!ehIndividual(r["Tipo de Emenda"] ?? "")) return;
    const ano = Number((r["Ano/Mês"] ?? "").slice(0, 4)) || 0;
    if (ano < ANO_MANDATO_INICIO) return;
    const pid = porAutor.get(normalizaNome(r["Nome do Autor da Emenda"] ?? ""));
    if (!pid) return;
    rows.push({
      parlamentarId: pid,
      codigoEmenda: r["Código da Emenda"] || "",
      doc: r["Código do Favorecido"] || "",
      nome: r["Favorecido"] || "",
      tipoPessoa: tipoPessoa(r["Tipo Favorecido"] ?? ""),
      valorPago: valorBR(r["Valor Recebido"]),
      ano,
    });
  });

  await prisma.favorecido.deleteMany({});
  await inserirEmLotes(rows, async (chunk) => {
    await prisma.favorecido.createMany({ data: chunk });
  });
  return rows.length;
}
