import { fetchJson } from "../lib/http";
import { prisma } from "../db/client";
import { soDigitos } from "../lib/texto";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";

async function cpfDeputado(externalId: string): Promise<string | null> {
  const r = await fetchJson<{ dados?: { cpf?: string } }>(`${CAMARA}/deputados/${externalId}`).catch(
    () => null,
  );
  const cpf = soDigitos(r?.dados?.cpf ?? "");
  return cpf.length === 11 ? cpf : null;
}

interface SenadorDetalhe {
  DetalheParlamentar?: {
    Parlamentar?: { IdentificacaoParlamentar?: { NumeroCpf?: string } };
  };
}

async function cpfSenador(externalId: string): Promise<string | null> {
  const r = await fetchJson<SenadorDetalhe>(`${SENADO}/senador/${externalId}.json`).catch(() => null);
  const cpf = soDigitos(r?.DetalheParlamentar?.Parlamentar?.IdentificacaoParlamentar?.NumeroCpf ?? "");
  return cpf.length === 11 ? cpf : null;
}

// Preenche o CPF dos parlamentares que ainda não têm (via detalhe da Câmara/Senado).
// Necessário para casar as doações do TSE por CPF (nome civil ≠ nome parlamentar).
export async function enrichCpfs(): Promise<{ ok: number; total: number }> {
  const parlamentares = await prisma.parlamentar.findMany({ where: { cpf: null } });
  let ok = 0;
  for (const p of parlamentares) {
    const cpf = p.casa === "CAMARA" ? await cpfDeputado(p.externalId) : await cpfSenador(p.externalId);
    if (cpf) {
      await prisma.parlamentar.update({ where: { id: p.id }, data: { cpf } });
      ok++;
    }
  }
  return { ok, total: parlamentares.length };
}
