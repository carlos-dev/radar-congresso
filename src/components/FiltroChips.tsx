import Link from "next/link";
import type { CSSProperties } from "react";
import type { FiltroRadar } from "@/lib/dados";

type Props = {
  filtro: FiltroRadar;
  q?: string;
};

const CHIPS: { key: FiltroRadar; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "camara", label: "Câmara" },
  { key: "senado", label: "Senado" },
  { key: "alerta", label: "Com sinal para olhar" },
];

function hrefPara(key: FiltroRadar, q?: string): string {
  const params = new URLSearchParams();
  if (key !== "todos") params.set("filtro", key);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/** Chips de filtro como links (preservam a busca atual). */
export function FiltroChips({ filtro, q }: Props) {
  return (
    <div
      className="flex flex-wrap gap-2 border-t pt-4"
      style={{ borderColor: "var(--ds-hair)" }}
    >
      {CHIPS.map((chip) => {
        const ativo = chip.key === filtro;
        return (
          <Link
            key={chip.key}
            href={hrefPara(chip.key, q)}
            aria-current={ativo ? "true" : undefined}
            className="rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
            style={
              ativo
                ? ({
                    backgroundColor: "var(--ds-primary-light)",
                    borderColor: "var(--ds-primary)",
                    color: "var(--ds-primary-darker)",
                  } as CSSProperties)
                : ({
                    backgroundColor: "var(--ds-card)",
                    borderColor: "var(--ds-hair)",
                    color: "var(--ds-emphasis)",
                  } as CSSProperties)
            }
          >
            {chip.label}
          </Link>
        );
      })}
    </div>
  );
}
