import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { normalizaNome } from "../../lib/texto";

export interface CotaNormalizada {
  nomeParlamentar: string;
  uf: string;
  ano: number;
  mes: number;
  tipo: string;
  fornecedorNome: string;
  fornecedorDoc: string | null;
  valor: number;
}

interface LinhaCota {
  txNomeParlamentar: string;
  sgUF: string;
  numAno: string;
  numMes: string;
  txtDescricao: string;
  txtFornecedor: string;
  txtCNPJCPF: string;
  vlrLiquido: string;
}

function valor(v: string): number {
  let s = (v ?? "").trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

export function parseLinhaCota(l: LinhaCota): CotaNormalizada {
  return {
    nomeParlamentar: l.txNomeParlamentar,
    uf: l.sgUF,
    ano: Number(l.numAno) || 0,
    mes: Number(l.numMes) || 0,
    tipo: l.txtDescricao,
    fornecedorNome: l.txtFornecedor,
    fornecedorDoc: l.txtCNPJCPF || null,
    valor: valor(l.vlrLiquido),
  };
}

// Ingere a CEAP a partir do CSV em massa da Câmara (Ano-XXXX.csv), casando por
// nuDeputadoId = externalId. Usada porque o endpoint /despesas por deputado da
// API está retornando vazio. Idempotente por (parlamentar, ano).
export async function ingestCotaArquivo(csvPath: string): Promise<number> {
  const conteudo = (await readFile(csvPath, "utf8")).replace(/^﻿/, "");
  const linhas = conteudo.split(/\r?\n/).filter(Boolean);
  const limpa = (s: string) => s.replace(/^﻿/, "").replace(/"/g, "").trim();
  const header = linhas[0].split(";").map(limpa);
  const col = (c: string) => header.indexOf(c);

  // A CEAP usa ids legados (ideCadastro/nuDeputadoId) e não traz CPF, mas o
  // txNomeParlamentar é o nome parlamentar (igual ao nosso) — casamos por nome+UF.
  const deputados = await prisma.parlamentar.findMany({ where: { casa: "CAMARA" }, select: { id: true, nome: true, uf: true } });
  const porNomeUf = new Map<string, string>();
  for (const d of deputados) porNomeUf.set(`${normalizaNome(d.nome)}|${d.uf ?? ""}`, d.id);

  const anos = new Set<number>();
  const buffer: { parlamentarId: string; c: CotaNormalizada }[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";").map((c) => c.replace(/"/g, ""));
    const raw: LinhaCota = {
      txNomeParlamentar: cols[col("txNomeParlamentar")] ?? "",
      sgUF: cols[col("sgUF")] ?? "",
      numAno: cols[col("numAno")] ?? "0",
      numMes: cols[col("numMes")] ?? "0",
      txtDescricao: cols[col("txtDescricao")] ?? "",
      txtFornecedor: cols[col("txtFornecedor")] ?? "",
      txtCNPJCPF: cols[col("txtCNPJCPF")] ?? "",
      vlrLiquido: cols[col("vlrLiquido")] ?? "0",
    };
    const c = parseLinhaCota(raw);
    const pid = porNomeUf.get(`${normalizaNome(c.nomeParlamentar)}|${c.uf}`);
    if (!pid) continue;
    buffer.push({ parlamentarId: pid, c });
    anos.add(c.ano);
  }

  const pids = [...new Set(buffer.map((b) => b.parlamentarId))];
  await prisma.despesa.deleteMany({ where: { parlamentarId: { in: pids }, ano: { in: [...anos] } } });
  await prisma.despesa.createMany({
    data: buffer.map((b) => ({
      parlamentarId: b.parlamentarId,
      ano: b.c.ano,
      mes: b.c.mes,
      tipo: b.c.tipo,
      fornecedorNome: b.c.fornecedorNome,
      fornecedorDoc: b.c.fornecedorDoc,
      valor: b.c.valor,
    })),
  });
  return buffer.length;
}
