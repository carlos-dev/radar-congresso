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

  // Um mesmo beneficiário (doc) pode aparecer em várias emendas; agregamos por
  // documento (somando o valor pago) para não gerar conexões duplicadas.
  const porDoc = new Map<string, BeneficiarioInput>();
  for (const f of favorecidos) {
    const chave = soDigitos(f.doc);
    const existente = porDoc.get(chave);
    if (existente) {
      existente.valorPago += f.valorPago;
      existente.ano = Math.max(existente.ano, f.ano);
    } else {
      porDoc.set(chave, {
        doc: f.doc,
        nome: f.nome,
        tipoPessoa: f.tipoPessoa === "PJ" ? "PJ" : "PF",
        valorPago: f.valorPago,
        ano: f.ano,
        socios: sociosPorCnpj.get(chave) ?? [],
      });
    }
  }
  const beneficiarios: BeneficiarioInput[] = [...porDoc.values()];

  return detectarConexoes({
    doadores: doacoes.map((d) => ({ nome: d.doadorNome, doc: d.doadorDoc, valor: d.valor, ano: d.ano })),
    beneficiarios,
  });
}
