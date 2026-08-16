import { prisma } from "../db/client";
import { soDigitos } from "../lib/texto";
import { detectarConexoes, type Conexao, type BeneficiarioInput } from "../analysis/conexoes";

export async function obterConexoes(parlamentarId: string): Promise<Conexao[]> {
  const [doacoes, favorecidos] = await Promise.all([
    prisma.doacao.findMany({ where: { parlamentarId } }),
    prisma.favorecido.findMany({ where: { parlamentarId } }),
  ]);
  if (doacoes.length === 0 || favorecidos.length === 0) return [];

  const cnpjs = [...new Set(favorecidos.filter((f) => f.tipoPessoa === "PJ").map((f) => soDigitos(f.doc)))];
  const sociosRows = cnpjs.length
    ? await prisma.socio.findMany({ where: { cnpj: { in: cnpjs } } })
    : [];
  const sociosPorCnpj = new Map<string, { nome: string; doc: string }[]>();
  for (const s of sociosRows) {
    const arr = sociosPorCnpj.get(s.cnpj) ?? [];
    arr.push({ nome: s.nome, doc: s.doc });
    sociosPorCnpj.set(s.cnpj, arr);
  }

  const beneficiarios: BeneficiarioInput[] = favorecidos.map((f) => ({
    doc: f.doc,
    nome: f.nome,
    tipoPessoa: f.tipoPessoa === "PJ" ? "PJ" : "PF",
    valorPago: f.valorPago,
    ano: f.ano,
    socios: sociosPorCnpj.get(soDigitos(f.doc)) ?? [],
  }));

  return detectarConexoes({
    doadores: doacoes.map((d) => ({ nome: d.doadorNome, doc: d.doadorDoc, valor: d.valor, ano: d.ano })),
    beneficiarios,
  });
}
