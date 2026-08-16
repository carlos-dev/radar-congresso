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

function comparaPessoa(aNome: string, aDoc: string, bNome: string, bDoc: string): Confianca | null {
  const nomeA = normalizaNome(aNome);
  const nomeB = normalizaNome(bNome);
  if (!nomeA || nomeA !== nomeB) return null;

  const digA = soDigitos(aDoc);
  const digB = soDigitos(bDoc);
  const MIN = 6; // um CPF mascarado expõe 6 dígitos; abaixo disso não dá para confirmar
  if (digA.length >= MIN && digB.length >= MIN) {
    // Ambos têm dígitos confiáveis: só é "alta" se forem exatamente iguais;
    // dígitos diferentes = homônimo, rejeita.
    return digA === digB ? "alta" : null;
  }
  // Sem dígitos suficientes para confirmar nem rejeitar: cai para nome só.
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
