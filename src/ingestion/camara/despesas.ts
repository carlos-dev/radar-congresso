import { fetchJson } from "../../lib/http";
import { prisma } from "../../db/client";
import { BASE } from "./config";

export interface DespesaNormalizada {
  ano: number;
  mes: number;
  tipo: string;
  fornecedorNome: string;
  fornecedorDoc: string | null;
  valor: number;
}

interface CamaraDespesa {
  ano: number;
  mes: number;
  tipoDespesa: string;
  nomeFornecedor: string;
  cnpjCpfFornecedor?: string;
  valorLiquido: number;
}

export function parseDespesas(raw: { dados: CamaraDespesa[] }): DespesaNormalizada[] {
  return raw.dados.map((d) => ({
    ano: d.ano,
    mes: d.mes,
    tipo: d.tipoDespesa,
    fornecedorNome: d.nomeFornecedor,
    fornecedorDoc: d.cnpjCpfFornecedor ?? null,
    valor: d.valorLiquido,
  }));
}

export async function ingestDespesas(
  parlamentarId: string,
  externalId: string,
  ano: number,
): Promise<number> {
  const raw = await fetchJson<{ dados: CamaraDespesa[] }>(
    `${BASE}/deputados/${externalId}/despesas?ano=${ano}&itens=100`,
  );
  const despesas = parseDespesas(raw);
  await prisma.$transaction([
    prisma.despesa.deleteMany({ where: { parlamentarId, ano } }),
    prisma.despesa.createMany({ data: despesas.map((d) => ({ ...d, parlamentarId })) }),
  ]);
  return despesas.length;
}
