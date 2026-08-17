// Curadoria leve (camada humana do híbrido). A heurística ordena os candidatos;
// aqui só (a) damos título em linguagem clara ao que temos certeza e (b)
// ocultamos ruído procedural que a heurística pegou por engano.
//
// Regra de ouro: só rotular o que dá para afirmar com segurança. Na dúvida,
// deixar `titulo` de fora — a UI cai numa versão limpa da descrição oficial.
export interface OverrideVotacao {
  externalId: string;
  destaque?: boolean; // true força aparecer, false oculta
  titulo?: string; // rótulo em português claro
}

export const CURADORIA_VOTACOES: OverrideVotacao[] = [
  // Reforma Tributária (PEC 45/2019) — texto na Câmara e retorno do Senado.
  { externalId: "2196833-373", titulo: "Reforma Tributária (PEC 45/2019) — 2º turno", destaque: true },
  { externalId: "259094-136", titulo: "Reforma Tributária (PEC 45/2019) — 1º turno, texto do Senado", destaque: true },
  { externalId: "259094-190", titulo: "Reforma Tributária (PEC 45/2019) — 2º turno, texto do Senado", destaque: true },
  // Regulamentação da Reforma Tributária.
  { externalId: "2430143-72", titulo: "Regulamentação da Reforma Tributária (PLP 68/2024)", destaque: true },
  { externalId: "2430143-140", titulo: "Regulamentação da Reforma Tributária (PLP 68/2024) — texto do Senado", destaque: true },
  { externalId: "2438459-55", titulo: "Reforma Tributária — Comitê Gestor do IBS (PLP 108/2024)", destaque: true },

  // Ruído procedural (requerimentos de quebra de interstício) — ocultar.
  { externalId: "2561475-6", destaque: false },
  { externalId: "2481282-8", destaque: false },
  { externalId: "2372099-6", destaque: false },
];
