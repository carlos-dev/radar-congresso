import { readFile } from "node:fs/promises";
import { prisma } from "../../db/client";
import { soDigitos } from "../../lib/texto";

export interface DoacaoNormalizada {
  candidatoNome: string;
  cpfCandidato: string;
  uf: string;
  cargo: string;
  doadorNome: string;
  doadorDoc: string;
  valor: number;
  ano: number;
}

interface LinhaTSE {
  NM_CANDIDATO: string;
  NR_CPF_CANDIDATO: string;
  SG_UF: string;
  DS_CARGO: string;
  NM_DOADOR: string;
  NR_CPF_CNPJ_DOADOR: string;
  VR_RECEITA: string;
  AA_ELEICAO: string;
}

function valorBR(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function parseLinhaDoacao(l: LinhaTSE): DoacaoNormalizada {
  return {
    candidatoNome: l.NM_CANDIDATO,
    cpfCandidato: soDigitos(l.NR_CPF_CANDIDATO),
    uf: l.SG_UF,
    cargo: l.DS_CARGO,
    doadorNome: l.NM_DOADOR,
    doadorDoc: l.NR_CPF_CNPJ_DOADOR,
    valor: valorBR(l.VR_RECEITA),
    ano: Number(l.AA_ELEICAO),
  };
}

export async function ingestDoacoes(caminhoCsv: string): Promise<number> {
  const conteudo = await readFile(caminhoCsv, "latin1");
  const linhas = conteudo.split(/\r?\n/).filter(Boolean);
  const header = linhas[0].split(";").map((c) => c.replace(/"/g, "").trim());
  const idx = (c: string) => header.indexOf(c);

  // Casamento por CPF do candidato: o TSE usa o nome civil completo, diferente
  // do nome parlamentar — então o CPF (que o TSE traz completo) é a chave certa.
  const parlamentares = await prisma.parlamentar.findMany({ where: { cpf: { not: null } } });
  const porCpf = new Map<string, string>();
  for (const p of parlamentares) porCpf.set(soDigitos(p.cpf), p.id);

  const anos = new Set<number>();
  const buffer: { parlamentarId: string; d: DoacaoNormalizada }[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(";").map((c) => c.replace(/^"|"$/g, ""));
    const raw: LinhaTSE = {
      NM_CANDIDATO: cols[idx("NM_CANDIDATO")] ?? "",
      NR_CPF_CANDIDATO: cols[idx("NR_CPF_CANDIDATO")] ?? "",
      SG_UF: cols[idx("SG_UF")] ?? "",
      DS_CARGO: cols[idx("DS_CARGO")] ?? "",
      NM_DOADOR: cols[idx("NM_DOADOR")] ?? "",
      NR_CPF_CNPJ_DOADOR: cols[idx("NR_CPF_CNPJ_DOADOR")] ?? "",
      VR_RECEITA: cols[idx("VR_RECEITA")] ?? "0",
      AA_ELEICAO: cols[idx("AA_ELEICAO")] ?? "0",
    };
    const d = parseLinhaDoacao(raw);
    const pid = porCpf.get(d.cpfCandidato);
    if (!pid) continue;
    buffer.push({ parlamentarId: pid, d });
    anos.add(d.ano);
  }

  const pids = [...new Set(buffer.map((b) => b.parlamentarId))];
  await prisma.doacao.deleteMany({ where: { parlamentarId: { in: pids }, ano: { in: [...anos] } } });
  await prisma.doacao.createMany({
    data: buffer.map((b) => ({
      parlamentarId: b.parlamentarId, doadorNome: b.d.doadorNome, doadorDoc: b.d.doadorDoc,
      valor: b.d.valor, ano: b.d.ano, cargo: b.d.cargo,
    })),
  });
  return buffer.length;
}
