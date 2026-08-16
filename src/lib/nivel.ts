import type { Nivel } from "@/lib/tipos";

type NivelConfig = {
  /** Rótulo curto (linha da lista, selo do card). */
  rotulo: string;
  /** Rótulo do selo geral, no perfil. */
  rotuloGeral: string;
  /** Cor principal (barra do radar, texto do selo geral). */
  cor: string;
  /** Cor escurecida (texto legível sobre fundo claro). */
  corEscura: string;
  /** Fundo do selo/pílula. */
  bg: string;
};

/** Fonte única de verdade dos níveis — usa as CSS vars da paleta em globals.css. */
export const NIVEL_CONFIG: Record<Nivel, NivelConfig> = {
  ok: {
    rotulo: "Tudo certo",
    rotuloGeral: "Tudo certo por aqui",
    cor: "var(--ds-ok)",
    corEscura: "var(--ds-ok-dark)",
    bg: "var(--ds-ok-bg)",
  },
  atencao: {
    rotulo: "Atenção",
    rotuloGeral: "Vale ficar de olho",
    cor: "var(--ds-atencao)",
    corEscura: "var(--ds-atencao-dark)",
    bg: "var(--ds-atencao-bg)",
  },
  alerta: {
    rotulo: "Sinal de alerta",
    rotuloGeral: "Tem sinal de alerta",
    cor: "var(--ds-alerta)",
    corEscura: "var(--ds-alerta-dark)",
    bg: "var(--ds-alerta-bg)",
  },
  sem_dado: {
    rotulo: "Sem dados",
    rotuloGeral: "Ainda sem dados",
    cor: "var(--ds-semdado)",
    corEscura: "var(--ds-semdado-dark)",
    bg: "var(--ds-semdado-bg)",
  },
};
