import { prisma } from "../db/client";
import { soDigitos } from "../lib/texto";
import { ANO_REFERENCIA } from "../lib/config";
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
  }).map((c) => ({ ...c, origem: "emenda" as const }));
}

/**
 * Cruzamento CEAP↔doador: um doador de campanha é fornecedor da cota do
 * parlamentar (ou sócio de fornecedor). Diferente das emendas, os fornecedores
 * da cota são empresas privadas nomeadas diretamente — sem o pulo do município.
 * Requer que os sócios dos CNPJs fornecedores já tenham sido buscados (Socio).
 */
export async function obterConexoesCota(parlamentarId: string): Promise<Conexao[]> {
  const [doacoes, fornecedores] = await Promise.all([
    prisma.doacao.findMany({ where: { parlamentarId } }),
    prisma.despesa.groupBy({
      by: ["fornecedorNome", "fornecedorDoc"],
      where: { parlamentarId, ano: ANO_REFERENCIA },
      _sum: { valor: true },
      orderBy: { _sum: { valor: "desc" } },
      take: 50,
    }),
  ]);
  if (doacoes.length === 0 || fornecedores.length === 0) return [];

  const cnpjs = [
    ...new Set(
      fornecedores
        .map((f) => soDigitos(f.fornecedorDoc))
        .filter((c) => c.length === 14),
    ),
  ];
  const sociosRows = cnpjs.length
    ? await prisma.socio.findMany({ where: { cnpj: { in: cnpjs } } })
    : [];
  const sociosPorCnpj = new Map<string, { nome: string; doc: string }[]>();
  for (const s of sociosRows) {
    const arr = sociosPorCnpj.get(s.cnpj) ?? [];
    arr.push({ nome: s.nome, doc: s.doc });
    sociosPorCnpj.set(s.cnpj, arr);
  }

  const beneficiarios: BeneficiarioInput[] = fornecedores.map((f) => {
    const dig = soDigitos(f.fornecedorDoc);
    return {
      doc: f.fornecedorDoc ?? "",
      nome: f.fornecedorNome,
      tipoPessoa: dig.length > 11 ? "PJ" : "PF",
      valorPago: f._sum.valor ?? 0,
      ano: ANO_REFERENCIA,
      socios: sociosPorCnpj.get(dig) ?? [],
    };
  });

  return detectarConexoes({
    doadores: doacoes.map((d) => ({ nome: d.doadorNome, doc: d.doadorDoc, valor: d.valor, ano: d.ano })),
    beneficiarios,
  }).map((c) => ({ ...c, origem: "cota" as const }));
}
