import { NIVEL_CONFIG } from "@/lib/nivel";
import type { RedFlag } from "@/lib/tipos";

type Props = {
  redFlags: RedFlag[];
  /** `lista` = barras 7x26; `perfil` = barras altas 12x52. */
  variante?: "lista" | "perfil";
};

/** Uma barra por sinal, colorida pelo nível daquele sinal. */
export function RadarBars({ redFlags, variante = "lista" }: Props) {
  const dim = variante === "perfil" ? { w: 12, h: 52, gap: "gap-1.5" } : { w: 7, h: 26, gap: "gap-1" };

  return (
    <span className={`inline-flex items-end ${dim.gap}`} aria-hidden="true">
      {redFlags.map((rf) => (
        <span
          key={rf.id}
          className="rounded-[2px]"
          style={{ width: dim.w, height: dim.h, backgroundColor: NIVEL_CONFIG[rf.nivel].cor }}
        />
      ))}
    </span>
  );
}
