import { normalizaNome, soDigitos } from "../lib/texto";

export type Confianca = "alta" | "media" | "baixa";
export type TipoConexao = "DIRETA" | "SOCIO";

export interface DoadorInput {
  nome: string;
  doc: string;
  valor: number;
  ano: number;
}

export interface BeneficiarioInput {
  doc: string;
  nome: string;
  tipoPessoa: "PF" | "PJ";
  valorPago: number;
  ano: number;
  socios: { nome: string; doc: string }[];
}

export interface ConexoesInput {
  doadores: DoadorInput[];
  beneficiarios: BeneficiarioInput[];
}

export interface Conexao {
  tipo: TipoConexao;
  doadorNome: string;
  doadorDoc: string;
  empresaCnpj: string | null;
  empresaNome: string | null;
  valorDoacao: number;
  valorEmenda: number;
  ano: number;
  confianca: Confianca;
}

// Janela comparável de um CPF: os 6 dígitos do meio. O TSE fornece o CPF
// COMPLETO (11 dígitos); a base de sócios (Receita/BrasilAPI) fornece
// MASCARADO (só os 6 do meio, ex.: ***.XXX.XXX-**). Reduzir ambos aos 6 do
// meio permite casar as duas fontes. Retorna null quando não há janela de 6
// (ex.: CNPJ de 14 dígitos ou fragmento inválido) — aí não dá para confirmar.
function janelaCpf(doc: string): string | null {
  const dig = soDigitos(doc);
  if (dig.length === 11) return dig.slice(3, 9);
  if (dig.length === 6) return dig;
  return null;
}

function comparaPessoa(aNome: string, aDoc: string, bNome: string, bDoc: string): Confianca | null {
  const nomeA = normalizaNome(aNome);
  const nomeB = normalizaNome(bNome);
  if (!nomeA || nomeA !== nomeB) return null;

  const chaveA = janelaCpf(aDoc);
  const chaveB = janelaCpf(bDoc);
  if (chaveA && chaveB) {
    // Ambos têm a janela de 6 dígitos: só é "alta" se forem iguais;
    // dígitos diferentes = homônimo, rejeita.
    return chaveA === chaveB ? "alta" : null;
  }
  // Sem janela comparável em pelo menos um lado: cai para nome só.
  return "media";
}

const RANK: Record<Confianca, number> = { alta: 2, media: 1, baixa: 0 };

export function detectarConexoes(input: ConexoesInput): Conexao[] {
  const conexoes: Conexao[] = [];
  for (const b of input.beneficiarios) {
    for (const d of input.doadores) {
      const direto = comparaPessoa(d.nome, d.doc, b.nome, b.doc);
      if (direto) {
        conexoes.push({
          tipo: "DIRETA",
          doadorNome: d.nome,
          doadorDoc: d.doc,
          empresaCnpj: b.tipoPessoa === "PJ" ? b.doc : null,
          empresaNome: b.tipoPessoa === "PJ" ? b.nome : null,
          valorDoacao: d.valor,
          valorEmenda: b.valorPago,
          ano: b.ano,
          confianca: direto,
        });
        continue;
      }
      if (b.tipoPessoa === "PJ") {
        let melhor: Confianca | null = null;
        for (const s of b.socios) {
          const viaSocio = comparaPessoa(d.nome, d.doc, s.nome, s.doc);
          if (viaSocio && (melhor === null || RANK[viaSocio] > RANK[melhor])) {
            melhor = viaSocio;
          }
        }
        if (melhor) {
          conexoes.push({
            tipo: "SOCIO",
            doadorNome: d.nome,
            doadorDoc: d.doc,
            empresaCnpj: b.doc,
            empresaNome: b.nome,
            valorDoacao: d.valor,
            valorEmenda: b.valorPago,
            ano: b.ano,
            confianca: melhor,
          });
        }
      }
    }
  }
  return conexoes;
}
