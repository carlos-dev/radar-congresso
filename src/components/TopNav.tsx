import Link from "next/link";
import { RadarLogo } from "@/components/RadarLogo";

type Props = { updatedLabel?: string };

/** Barra de navegação da faixa escura: logo animado + wordmark + selo de atualização. */
export function TopNav({ updatedLabel }: Props) {
  return (
    <nav
      className="flex items-center justify-between gap-4 border-b py-4"
      style={{ borderColor: "var(--ds-on-dark-8)" }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <RadarLogo />
        <span className="text-[13px] font-semibold uppercase leading-none tracking-[0.14em]">
          Radar do Congresso
        </span>
      </Link>
      {updatedLabel ? (
        <span
          className="text-[11px] uppercase tracking-[0.08em]"
          style={{ color: "var(--ds-on-dark-48)" }}
        >
          {updatedLabel}
        </span>
      ) : null}
    </nav>
  );
}
