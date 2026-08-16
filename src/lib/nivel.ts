import type { Nivel } from "@/lib/tipos";

type NivelConfig = {
  /** Rótulo curto usado no selo. */
  rotulo: string;
  /** Rótulo do selo geral, no perfil. */
  rotuloGeral: string;
  /** Classes do selo (fundo + texto + borda). */
  badge: string;
  /** Cor da borda de acento do card. */
  acento: string;
  /** Cor do ponto indicador. */
  ponto: string;
};

/** Fonte única de verdade dos níveis — evita `if` espalhado pela UI. */
export const NIVEL_CONFIG: Record<Nivel, NivelConfig> = {
  ok: {
    rotulo: "Tudo certo",
    rotuloGeral: "Tudo certo por aqui",
    badge:
      "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
    acento: "border-l-emerald-500 dark:border-l-emerald-400",
    ponto: "bg-emerald-600 dark:bg-emerald-400",
  },
  atencao: {
    rotulo: "Atenção",
    rotuloGeral: "Vale ficar de olho",
    badge:
      "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800",
    acento: "border-l-amber-500 dark:border-l-amber-400",
    ponto: "bg-amber-600 dark:bg-amber-400",
  },
  alerta: {
    rotulo: "Sinal de alerta",
    rotuloGeral: "Tem sinal de alerta",
    badge:
      "bg-red-50 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
    acento: "border-l-red-500 dark:border-l-red-400",
    ponto: "bg-red-600 dark:bg-red-400",
  },
  sem_dado: {
    rotulo: "Sem dados",
    rotuloGeral: "Ainda sem dados",
    badge: "bg-muted text-muted-foreground border-border",
    acento: "border-l-muted-foreground/40",
    ponto: "bg-muted-foreground/60",
  },
};
