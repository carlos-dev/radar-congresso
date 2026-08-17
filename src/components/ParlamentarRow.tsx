import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { RadarBars } from "@/components/RadarBars";
import { NIVEL_CONFIG } from "@/lib/nivel";
import { iniciais } from "@/lib/iniciais";
import type { Perfil } from "@/lib/dados";

type Props = { p: Perfil };

/** Linha da lista: iniciais + nome + radar de 4 barras + rótulo geral + seta. */
export function ParlamentarRow({ p }: Props) {
  const geral = NIVEL_CONFIG[p.ficha.nivelGeral];
  const partidoUf = [p.partido, p.uf].filter(Boolean).join("-") || "Sem partido";
  const casa = p.casa === "SENADO" ? "Senado" : "Câmara";

  return (
    <Link
      href={`/parlamentar/${p.id}`}
      aria-label={`Ver ficha de ${p.nome}, ${partidoUf}, ${casa}`}
      className="linha-parlamentar group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[18px] border-b border-l-[3px] border-l-transparent px-4 py-4 transition-colors hover:border-l-[color:var(--geral)] hover:bg-[color:var(--ds-hair)]"
      style={
        {
          borderBottomColor: "var(--ds-hair)",
          "--geral": geral.cor,
        } as CSSProperties
      }
    >
      {p.urlFoto ? (
        <Image
          src={p.urlFoto}
          alt=""
          width={46}
          height={46}
          className="size-[46px] shrink-0 rounded-md border object-cover"
          style={{ borderColor: "var(--ds-hair)" }}
        />
      ) : (
        <span
          className="flex size-[46px] items-center justify-center rounded-md border text-[15px] font-semibold"
          style={{ borderColor: "var(--ds-hair)", color: "var(--ds-emphasis)" }}
        >
          {iniciais(p.nome)}
        </span>
      )}

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[17px] font-semibold">{p.nome}</span>
        <span
          className="truncate text-[12px] uppercase tracking-[0.06em]"
          style={{ color: "var(--ds-muted)" }}
        >
          {partidoUf} · {casa}
        </span>
      </span>

      <span className="flex items-center gap-4">
        <span
          className="hidden min-w-[104px] text-right text-[11px] font-semibold uppercase tracking-[0.06em] sm:block"
          style={{ color: geral.corEscura }}
        >
          {geral.rotulo}
        </span>
        <RadarBars redFlags={p.ficha.redFlags} variante="lista" />
        <span
          className="text-lg transition-transform group-hover:translate-x-1"
          style={{ color: "var(--ds-subtle)" }}
          aria-hidden="true"
        >
          →
        </span>
      </span>
    </Link>
  );
}
