import { NIVEL_CONFIG } from "@/lib/nivel";
import type { RedFlag } from "@/lib/tipos";

type Props = {
  rf: RedFlag;
  /** Posição (1..4) para o número grande do card. */
  numero: number;
};

/** Card numerado com acento no topo, pílula de nível, frase simples e fonte. */
export function RedFlagCard({ rf, numero }: Props) {
  const c = NIVEL_CONFIG[rf.nivel];

  return (
    <article
      className="flex h-full flex-col rounded-lg border border-t-[3px]"
      style={{ backgroundColor: "var(--ds-card)", borderColor: "var(--ds-hair)", borderTopColor: c.cor }}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="text-[34px] font-semibold leading-none" style={{ color: "var(--ds-subtle)" }}>
          {String(numero).padStart(2, "0")}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
          style={{ backgroundColor: c.bg, color: c.corEscura }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: c.cor }}
            aria-hidden="true"
          />
          {c.rotulo}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-5 pb-4 pt-4">
        <h3
          className="text-[13px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: "var(--ds-muted)" }}
        >
          {rf.titulo}
        </h3>
        <p className="text-pretty text-[19px] leading-[1.42]" style={{ color: "var(--ds-ink)" }}>
          {rf.fraseSimples}
        </p>
      </div>

      <footer className="border-t px-5 py-3" style={{ borderColor: "var(--ds-hair)" }}>
        <p className="text-[11px]" style={{ color: "var(--ds-muted)" }}>
          Fonte: {rf.fonte}
        </p>
      </footer>
    </article>
  );
}
