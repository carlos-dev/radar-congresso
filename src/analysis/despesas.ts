import type { Nivel, RedFlag } from "./types";
import { nivelPorPercentil, pctInt } from "./percentil";

export interface DespesasInput {
  totalGasto: number;
  /** Fração de colegas que gastaram MENOS (0..1). Maior = pior. */
  percentilRuim: number;
  porFornecedor: Array<{ nome: string; valor: number }>;
  /** Categoria (tipo CEAP) do fornecedor dominante — para calibrar concentração. */
  categoriaConcentrada?: string | null;
}

const ORDEM: Nivel[] = ["sem_dado", "ok", "atencao", "alerta"];
const pior = (a: Nivel, b: Nivel): Nivel => (ORDEM.indexOf(a) >= ORDEM.indexOf(b) ? a : b);

// Concentrar gasto num fornecedor só é "pista" em categorias discricionárias
// (marketing/consultoria), onde há histórico de superfaturamento. Em transporte,
// aluguel ou combustível, concentrar é operacional e normal — não sinalizamos.
const CATEGORIA_DISCRICIONARIA = /divulga|consultoria|publicidade|pesquisa/i;
const PISO_CONCENTRACAO = 50000; // ignora concentração de quem gasta pouco

function categoriaBonita(tipo: string): string {
  const t = tipo.toLowerCase();
  if (/divulga/.test(t)) return "divulgação";
  if (/consultoria/.test(t)) return "consultoria";
  if (/publicidade/.test(t)) return "publicidade";
  if (/pesquisa/.test(t)) return "pesquisa de opinião";
  return "serviços";
}

export function redFlagDespesas(i: DespesasInput): RedFlag {
  const base = {
    id: "despesas",
    titulo: "Uso da cota parlamentar",
    fonte: "Câmara — Cota para Exercício da Atividade Parlamentar (CEAP)",
  };
  if (i.totalGasto <= 0) {
    return { ...base, nivel: "sem_dado", fraseSimples: "Sem gastos de cota registrados no período." };
  }

  // Sinal principal: gasto comparado aos pares (defensável, pode virar alerta).
  const nivelGasto = nivelPorPercentil(i.percentilRuim);

  // Sinal secundário: concentração — só em categoria discricionária, com piso,
  // e limitado a "atenção" (é pista a investigar, não prova).
  const maior = i.porFornecedor.reduce((m, f) => (f.valor > m.valor ? f : m), { nome: "", valor: 0 });
  const concentracao = maior.valor / i.totalGasto;
  const concentracaoRelevante =
    concentracao >= 0.7 &&
    i.totalGasto >= PISO_CONCENTRACAO &&
    CATEGORIA_DISCRICIONARIA.test(i.categoriaConcentrada ?? "");
  const nivelConc: Nivel = concentracaoRelevante ? "atencao" : "ok";

  const nivel = pior(nivelGasto, nivelConc);

  let frase: string;
  if (nivel === "ok") {
    frase = "Gastos dentro do normal.";
  } else if (ORDEM.indexOf(nivelGasto) >= ORDEM.indexOf(nivelConc)) {
    frase = `Gastou mais que ${pctInt(i.percentilRuim)}% dos colegas.`;
  } else {
    const cat = categoriaBonita(i.categoriaConcentrada ?? "");
    frase = `Concentrou ${Math.round(concentracao * 100)}% da cota em uma única empresa de ${cat} (${maior.nome}) — vale conferir.`;
  }
  return { ...base, nivel, fraseSimples: frase };
}
