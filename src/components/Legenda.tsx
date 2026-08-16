import type { Nivel } from "@/lib/tipos";
import { NIVEL_CONFIG } from "@/lib/nivel";

const ORDEM: Nivel[] = ["ok", "atencao", "alerta", "sem_dado"];

/** "Como ler o radar": barra colorida + rótulo para cada nível. */
export function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--ds-muted)" }}
      >
        Como ler o radar
      </span>
      {ORDEM.map((nivel) => {
        const c = NIVEL_CONFIG[nivel];
        return (
          <span key={nivel} className="inline-flex items-center gap-2">
            <span
              className="rounded-[2px]"
              style={{ width: 5, height: 14, backgroundColor: c.cor }}
              aria-hidden="true"
            />
            <span className="text-[13px]" style={{ color: "var(--ds-emphasis)" }}>
              {c.rotulo}
            </span>
          </span>
        );
      })}
    </div>
  );
}
